import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

/**
 * 验证规则类型
 */
export type ValidatorType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'phone' | 'date'

/**
 * 字段验证规则
 */
export interface FieldRule {
  type?: ValidatorType
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: (string | number)[]
  custom?: (value: any, data: any) => string | null
  sanitize?: boolean  // 是否进行XSS清理
  transform?: (value: any) => any  // 值转换函数
}

/**
 * 验证Schema
 */
export type ValidationSchema = {
  [key: string]: FieldRule
}

/**
 * 验证错误详情
 */
export interface ValidationError {
  field: string
  message: string
  value?: any
}

/**
 * XSS过滤 - 移除潜在危险的HTML标签和属性
 */
const xssFilter = (str: string): string => {
  if (typeof str !== 'string') return str

  return str
    // 移除script标签
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 移除事件处理器
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // 移除javascript:协议
    .replace(/javascript:/gi, '')
    // 移除data:协议（除了图片）
    .replace(/data:(?!image\/)/gi, '')
    // 移除vbscript:协议
    .replace(/vbscript:/gi, '')
    // 移除expression
    .replace(/expression\s*\(/gi, '')
    .trim()
}

/**
 * 类型验证器
 */
const typeValidators: Record<ValidatorType, (value: any) => boolean> = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && !isNaN(v),
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  email: (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => typeof v === 'string' && /^1[3-9]\d{9}$/.test(v),
  date: (v) => {
    if (v instanceof Date) return !isNaN(v.getTime())
    if (typeof v === 'string') return !isNaN(Date.parse(v))
    return false
  }
}

/**
 * 验证单个字段
 */
const validateField = (
  fieldName: string,
  value: any,
  rule: FieldRule,
  data: any
): ValidationError | null => {
  // 必填检查
  if (rule.required && (value === undefined || value === null || value === '')) {
    return { field: fieldName, message: `${fieldName}是必填字段` }
  }

  // 非必填且为空，跳过验证
  if (value === undefined || value === null || value === '') {
    return null
  }

  // 类型检查
  if (rule.type) {
    const validator = typeValidators[rule.type]
    if (!validator(value)) {
      return { field: fieldName, message: `${fieldName}类型不正确，期望${rule.type}`, value }
    }
  }

  // 字符串验证
  if (rule.type === 'string' || typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return { field: fieldName, message: `${fieldName}长度不能少于${rule.minLength}个字符`, value }
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return { field: fieldName, message: `${fieldName}长度不能超过${rule.maxLength}个字符`, value }
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      return { field: fieldName, message: `${fieldName}格式不正确`, value }
    }
  }

  // 数字验证
  if (rule.type === 'number' || typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return { field: fieldName, message: `${fieldName}不能小于${rule.min}`, value }
    }
    if (rule.max !== undefined && value > rule.max) {
      return { field: fieldName, message: `${fieldName}不能大于${rule.max}`, value }
    }
  }

  // 枚举验证
  if (rule.enum && !rule.enum.includes(value)) {
    return { field: fieldName, message: `${fieldName}必须是以下值之一: ${rule.enum.join(', ')}`, value }
  }

  // 自定义验证
  if (rule.custom) {
    const customError = rule.custom(value, data)
    if (customError) {
      return { field: fieldName, message: customError, value }
    }
  }

  return null
}

/**
 * 清理和转换值
 */
const sanitizeValue = (value: any, rule: FieldRule): any => {
  if (value === undefined || value === null) return value

  // XSS过滤
  if (rule.sanitize !== false && typeof value === 'string') {
    value = xssFilter(value)
  }

  // 类型转换
  if (rule.transform) {
    value = rule.transform(value)
  } else if (rule.type === 'number' && typeof value === 'string') {
    const num = parseFloat(value)
    if (!isNaN(num)) value = num
  } else if (rule.type === 'boolean' && typeof value === 'string') {
    if (value === 'true') value = true
    else if (value === 'false') value = false
  }

  return value
}

/**
 * 创建验证中间件
 * @param schema 验证规则
 * @param source 验证来源 'body' | 'query' | 'params'
 */
export const validate = (
  schema: ValidationSchema,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source]
    const errors: ValidationError[] = []
    const sanitizedData: any = {}

    // 验证所有字段
    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = data?.[fieldName]

      // 验证字段
      const error = validateField(fieldName, value, rule, data)
      if (error) {
        errors.push(error)
      } else {
        // 清理并存储值
        sanitizedData[fieldName] = sanitizeValue(value, rule)
      }
    }

    // 检查未知字段（可选，用于严格模式）
    // for (const key of Object.keys(data || {})) {
    //   if (!schema[key]) {
    //     errors.push({ field: key, message: `未知字段: ${key}` })
    //   }
    // }

    if (errors.length > 0) {
      logger.warn(`输入验证失败: ${req.method} ${req.path}`, { errors })

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '输入数据验证失败',
          details: errors
        }
      })
    }

    // 替换请求数据为清理后的数据
    req[source] = { ...data, ...sanitizedData }

    next()
  }
}

/**
 * 常用验证规则
 */
export const CommonRules = {
  // 用户名：3-20字符，字母数字下划线
  username: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    sanitize: true
  },

  // 密码：6-50字符
  password: {
    type: 'string' as const,
    required: true,
    minLength: 6,
    maxLength: 50,
    sanitize: false  // 密码不过滤
  },

  // 姓名：2-50字符
  borrowPin: {
    type: 'string' as const,
    required: true,
    pattern: /^\d{4,6}$/,
    sanitize: false
  },

  name: {
    type: 'string' as const,
    required: true,
    minLength: 2,
    maxLength: 50,
    sanitize: true
  },

  // 邮箱
  email: {
    type: 'email' as const,
    required: false,
    maxLength: 100,
    sanitize: true
  },

  // 手机号
  phone: {
    type: 'phone' as const,
    required: false,
    sanitize: true
  },

  // ID（正整数）
  id: {
    type: 'number' as const,
    required: true,
    min: 1,
    transform: (v: any) => parseInt(v, 10)
  },

  // 可选ID
  optionalId: {
    type: 'number' as const,
    required: false,
    min: 1,
    transform: (v: any) => v ? parseInt(v, 10) : undefined
  },

  // ISBN
  isbn: {
    type: 'string' as const,
    required: true,
    pattern: /^[\d-]{10,20}$/,
    sanitize: true
  },

  // 分页：页码
  page: {
    type: 'number' as const,
    required: false,
    min: 1,
    default: 1,
    transform: (v: any) => parseInt(v, 10) || 1
  },

  // 分页：每页数量
  pageSize: {
    type: 'number' as const,
    required: false,
    min: 1,
    max: 100,
    default: 20,
    transform: (v: any) => Math.min(parseInt(v, 10) || 20, 100)
  },

  // 搜索关键词
  keyword: {
    type: 'string' as const,
    required: false,
    maxLength: 100,
    sanitize: true
  },

  // 日期
  date: {
    type: 'date' as const,
    required: false
  },

  // 枚举：用户角色
  role: {
    type: 'string' as const,
    required: false,
    enum: ['admin', 'librarian', 'teacher', 'student', 'machine'],
    sanitize: true
  }
}

/**
 * 组合多个验证中间件
 */
export const combineValidators = (...validators: Array<(req: Request, res: Response, next: NextFunction) => void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const runValidator = (index: number): void => {
      if (index >= validators.length) {
        return next()
      }

      validators[index](req, res, (err?: any) => {
        if (err) return next(err)
        runValidator(index + 1)
      })
    }

    runValidator(0)
  }
}

/**
 * 预定义的验证Schema
 */
export const Schemas = {
  // 登录
  login: {
    username: CommonRules.username,
    password: { ...CommonRules.password, minLength: 1 }
  },

  // 注册
  register: {
    username: CommonRules.username,
    password: CommonRules.password,
    name: CommonRules.name,
    email: CommonRules.email,
    phone: CommonRules.phone,
    role: CommonRules.role
  },

  // 修改密码
  changePassword: {
    oldPassword: { ...CommonRules.password, minLength: 1 },
    newPassword: CommonRules.password
  },

  changeBorrowPin: {
    loginPassword: { ...CommonRules.password, minLength: 1 },
    borrowPin: CommonRules.borrowPin
  },

  // 分页查询
  pagination: {
    page: CommonRules.page,
    pageSize: CommonRules.pageSize,
    keyword: CommonRules.keyword
  },

  // 图书创建
  bookCreate: {
    title: { type: 'string', required: true, minLength: 1, maxLength: 200, sanitize: true },
    author: { type: 'string', required: true, minLength: 1, maxLength: 100, sanitize: true },
    isbn: CommonRules.isbn,
    publisher: { type: 'string', required: false, maxLength: 100, sanitize: true },
    category_id: CommonRules.optionalId,
    price: { type: 'number', required: false, min: 0 },
    stock: { type: 'number', required: false, min: 0 }
  },

  // 读者创建
  readerCreate: {
    name: CommonRules.name,
    email: CommonRules.email,
    phone: CommonRules.phone,
    category_id: { ...CommonRules.optionalId, required: true }
  },

  // 借阅
  borrow: {
    reader_id: { ...CommonRules.id, required: true },
    book_id: { ...CommonRules.id, required: true }
  },

  machineVerifyReader: {
    readerNo: { type: 'string' as const, required: true, minLength: 3, maxLength: 40, sanitize: true },
    borrowPin: CommonRules.borrowPin
  },

  machineBorrow: {
    readerNo: { type: 'string' as const, required: true, minLength: 3, maxLength: 40, sanitize: true },
    barcode: { type: 'string' as const, required: true, minLength: 3, maxLength: 80, sanitize: true },
    verificationToken: { type: 'string' as const, required: true, minLength: 16, maxLength: 200, sanitize: true }
  },

  machineReturn: {
    barcode: { type: 'string' as const, required: true, minLength: 3, maxLength: 80, sanitize: true }
  }
}
