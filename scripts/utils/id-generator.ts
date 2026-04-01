/**
 * 中国身份证号生成器
 * 符合 GB 11643-1999 标准
 */

// 行政区划代码（部分常用省市）
const AREA_CODES: Record<string, string[]> = {
  // 直辖市
  '北京市': ['110101', '110102', '110105', '110106', '110107', '110108', '110109', '110111', '110112', '110113', '110114', '110115', '110116', '110117'],
  '上海市': ['310101', '310104', '310105', '310106', '310107', '310109', '310110', '310112', '310113', '310114', '310115', '310116', '310117', '310118'],
  '天津市': ['120101', '120102', '120103', '120104', '120105', '120106', '120110', '120111', '120112', '120113', '120114', '120115'],
  '重庆市': ['500101', '500102', '500103', '500104', '500105', '500106', '500107', '500108', '500109', '500110', '500111', '500112', '500113', '500114'],

  // 省会城市
  '广州市': ['440103', '440104', '440105', '440106', '440111', '440112', '440113', '440114', '440115', '440117', '440118'],
  '深圳市': ['440303', '440304', '440305', '440306', '440307', '440308'],
  '杭州市': ['330102', '330103', '330104', '330105', '330106', '330108', '330109', '330110', '330111', '330112'],
  '南京市': ['320102', '320104', '320105', '320106', '320111', '320113', '320114', '320115', '320116', '320117'],
  '武汉市': ['420102', '420103', '420104', '420105', '420106', '420107', '420111', '420112', '420113', '420114', '420115', '420116', '420117'],
  '成都市': ['510104', '510105', '510106', '510107', '510108', '510112', '510113', '510114', '510115', '510116', '510117'],
  '西安市': ['610102', '610103', '610104', '610111', '610112', '610113', '610114', '610115', '610116', '610117', '610118', '610122'],
  '济南市': ['370102', '370103', '370104', '370105', '370112', '370113', '370114', '370124', '370125', '370126'],
  '沈阳市': ['210102', '210103', '210104', '210105', '210106', '210111', '210112', '210113', '210114', '210115'],
  '哈尔滨市': ['230102', '230103', '230104', '230108', '230109', '230110', '230111', '230112', '230113', '230123'],

  // 其他城市
  '苏州市': ['320505', '320506', '320507', '320508', '320509', '320581', '320582', '320583', '320585'],
  '青岛市': ['370202', '370203', '370211', '370212', '370213', '370214', '370215', '370281', '370282', '370283'],
  '厦门市': ['350203', '350205', '350206', '350211', '350212', '350213'],
  '长沙市': ['430102', '430103', '430104', '430105', '430111', '430112', '430121', '430124'],
  '郑州市': ['410102', '410103', '410104', '410105', '410106', '410108', '410122'],
  '合肥市': ['340102', '340103', '340104', '340111', '340121', '340122', '340123', '340124', '340181'],
  '福州市': ['350102', '350103', '350104', '350105', '350111', '350121', '350122', '350128']
}

// 常用城市列表
const CITIES = Object.keys(AREA_CODES)

// 校验码权重
const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]

// 校验码对照表
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

/**
 * 计算身份证校验码
 * @param id17 身份证前17位
 * @returns 校验码
 */
function calculateCheckCode(id17: string): string {
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(id17[i], 10) * WEIGHTS[i]
  }
  return CHECK_CODES[sum % 11]
}

/**
 * 生成指定日期的身份证号
 * @param birthDate 出生日期 (YYYY-MM-DD)
 * @param gender 性别 'male' | 'female'
 * @param areaCode 地区代码（可选）
 */
export function generateIdCard(
  birthDate: string,
  gender: 'male' | 'female',
  areaCode?: string
): string {
  // 选择地区代码
  let selectedAreaCode: string
  if (areaCode) {
    selectedAreaCode = areaCode
  } else {
    const city = CITIES[Math.floor(Math.random() * CITIES.length)]
    const codes = AREA_CODES[city]
    selectedAreaCode = codes[Math.floor(Math.random() * codes.length)]
  }

  // 生成出生日期码
  const dateStr = birthDate.replace(/-/g, '')

  // 生成顺序码（奇数为男性，偶数为女性）
  const sequenceBase = Math.floor(Math.random() * 500) * 2
  const sequence = gender === 'male' ? sequenceBase + 1 : sequenceBase
  const sequenceStr = sequence.toString().padStart(3, '0')

  // 组合前17位
  const id17 = selectedAreaCode + dateStr + sequenceStr

  // 计算校验码
  const checkCode = calculateCheckCode(id17)

  return id17 + checkCode
}

/**
 * 根据年龄生成身份证号
 * @param age 年龄
 * @param gender 性别
 */
export function generateIdCardByAge(
  age: number,
  gender: 'male' | 'female'
): string {
  const today = new Date()
  const birthYear = today.getFullYear() - age
  const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
  const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
  const birthDate = `${birthYear}-${birthMonth}-${birthDay}`
  return generateIdCard(birthDate, gender)
}

/**
 * 根据年龄段生成身份证号
 * @param minAge 最小年龄
 * @param maxAge 最大年龄
 * @param gender 性别
 */
export function generateIdCardByAgeRange(
  minAge: number,
  maxAge: number,
  gender: 'male' | 'female'
): string {
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge
  return generateIdCardByAge(age, gender)
}

/**
 * 验证身份证号格式
 * @param idCard 身份证号
 */
export function validateIdCard(idCard: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(idCard)) {
    return false
  }

  const checkCode = calculateCheckCode(idCard.slice(0, 17))
  return idCard[17].toUpperCase() === checkCode
}

/**
 * 从身份证号提取信息
 * @param idCard 身份证号
 */
export function extractIdCardInfo(idCard: string): {
  birthDate: string
  gender: 'male' | 'female'
  age: number
} | null {
  if (!validateIdCard(idCard)) {
    return null
  }

  const year = parseInt(idCard.slice(6, 10), 10)
  const month = idCard.slice(10, 12)
  const day = idCard.slice(12, 14)
  const sequence = parseInt(idCard.slice(14, 17), 10)

  const birthDate = `${year}-${month}-${day}`
  const gender: 'male' | 'female' = sequence % 2 === 1 ? 'male' : 'female'

  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return { birthDate, gender, age }
}

/**
 * 批量生成身份证号
 * @param count 数量
 * @param gender 性别分布 ('male' | 'female' | 'random')
 */
export function generateIdCards(
  count: number,
  gender: 'male' | 'female' | 'random' = 'random'
): string[] {
  const results: string[] = []
  for (let i = 0; i < count; i++) {
    const actualGender = gender === 'random'
      ? (Math.random() < 0.52 ? 'male' : 'female')
      : gender
    results.push(generateIdCardByAgeRange(18, 60, actualGender))
  }
  return results
}
