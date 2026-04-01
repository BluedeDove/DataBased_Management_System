/**
 * 中国手机号生成器
 */

// 运营商号段配置
const PHONE_PREFIXES = {
  // 中国移动
  mobile: [
    '134', '135', '136', '137', '138', '139',
    '150', '151', '152', '153', '155', '156', '157', '158', '159',
    '182', '183', '184', '187', '188',
    '198', '199'
  ],
  // 中国联通
  unicom: [
    '130', '131', '132',
    '155', '156',
    '185', '186',
    '176', '175'
  ],
  // 中国电信
  telecom: [
    '133', '149', '153',
    '180', '181', '189',
    '177', '173'
  ]
}

// 运营商市场占比（用于随机生成时的权重）
const CARRIER_WEIGHTS = {
  mobile: 0.55,   // 移动约55%
  unicom: 0.25,   // 联通约25%
  telecom: 0.20   // 电信约20%
}

type Carrier = 'mobile' | 'unicom' | 'telecom'

/**
 * 随机选择运营商
 */
function randomCarrier(): Carrier {
  const rand = Math.random()
  if (rand < CARRIER_WEIGHTS.mobile) return 'mobile'
  if (rand < CARRIER_WEIGHTS.mobile + CARRIER_WEIGHTS.unicom) return 'unicom'
  return 'telecom'
}

/**
 * 生成随机手机号
 * @param carrier 指定运营商（可选）
 */
export function generatePhoneNumber(carrier?: Carrier): string {
  const selectedCarrier = carrier || randomCarrier()
  const prefixes = PHONE_PREFIXES[selectedCarrier]
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]

  // 生成后8位随机数字
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')

  return prefix + suffix
}

/**
 * 生成指定运营商的手机号
 */
export function generateMobileNumber(): string {
  return generatePhoneNumber('mobile')
}

export function generateUnicomNumber(): string {
  return generatePhoneNumber('unicom')
}

export function generateTelecomNumber(): string {
  return generatePhoneNumber('telecom')
}

/**
 * 批量生成手机号
 * @param count 数量
 * @param carrier 运营商（可选）
 */
export function generatePhoneNumbers(count: number, carrier?: Carrier): string[] {
  const results: string[] = []
  for (let i = 0; i < count; i++) {
    results.push(generatePhoneNumber(carrier))
  }
  return results
}

/**
 * 验证手机号格式
 * @param phone 手机号
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!/^1\d{10}$/.test(phone)) {
    return false
  }

  const prefix = phone.slice(0, 3)
  const allPrefixes = [
    ...PHONE_PREFIXES.mobile,
    ...PHONE_PREFIXES.unicom,
    ...PHONE_PREFIXES.telecom
  ]

  return allPrefixes.includes(prefix)
}

/**
 * 判断手机号运营商
 * @param phone 手机号
 */
export function getCarrier(phone: string): Carrier | null {
  if (!validatePhoneNumber(phone)) {
    return null
  }

  const prefix = phone.slice(0, 3)

  if (PHONE_PREFIXES.mobile.includes(prefix)) return 'mobile'
  if (PHONE_PREFIXES.unicom.includes(prefix)) return 'unicom'
  if (PHONE_PREFIXES.telecom.includes(prefix)) return 'telecom'

  return null
}

/**
 * 生成固定电话号码（座机）
 * @param areaCode 区号（可选，默认北京010）
 */
export function generateLandlineNumber(areaCode: string = '010'): string {
  const number = Math.floor(Math.random() * 90000000 + 10000000).toString()
  return `${areaCode}-${number}`
}

// 常用区号
export const AREA_CODES = {
  '北京': '010',
  '上海': '021',
  '天津': '022',
  '重庆': '023',
  '广州': '020',
  '深圳': '0755',
  '杭州': '0571',
  '南京': '025',
  '武汉': '027',
  '成都': '028',
  '西安': '029',
  '济南': '0531',
  '沈阳': '024',
  '哈尔滨': '0451',
  '苏州': '0512',
  '青岛': '0532',
  '厦门': '0592',
  '长沙': '0731',
  '郑州': '0371',
  '合肥': '0551',
  '福州': '0591'
}
