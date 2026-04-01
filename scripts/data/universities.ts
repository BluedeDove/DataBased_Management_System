/**
 * 高校院系数据源
 * 用于生成读者所属机构
 */

// 高校院系列表（按学科分类）
export const UNIVERSITY_DEPARTMENTS = {
  // 理工科类
  engineering: [
    '计算机学院',
    '软件学院',
    '信息科学与技术学院',
    '电子工程学院',
    '自动化学院',
    '机械工程学院',
    '材料科学与工程学院',
    '土木工程学院',
    '化学工程学院',
    '能源与动力工程学院',
    '航空航天学院',
    '船舶与海洋工程学院',
    '建筑学院',
    '环境科学与工程学院',
    '生物医学工程学院'
  ],

  // 理学类
  science: [
    '数学学院',
    '物理学院',
    '化学学院',
    '生命科学学院',
    '地球科学学院',
    '天文与空间科学学院',
    '大气科学学院',
    '心理学院'
  ],

  // 人文社科类
  humanities: [
    '文学院',
    '历史学院',
    '哲学系',
    '外国语学院',
    '新闻与传播学院',
    '艺术学院',
    '马克思主义学院',
    '社会学系'
  ],

  // 经管法类
  business: [
    '经济学院',
    '管理学院',
    '商学院',
    '金融学院',
    '会计学院',
    '法学院',
    '公共管理学院'
  ],

  // 医学类
  medicine: [
    '医学院',
    '药学院',
    '公共卫生学院',
    '护理学院',
    '口腔医学院',
    '临床医学院'
  ],

  // 农学类
  agriculture: [
    '农学院',
    '林学院',
    '动物科学学院',
    '植物保护学院',
    '园艺学院',
    '食品科学学院'
  ],

  // 教育体育类
  education: [
    '教育学院',
    '体育学院',
    '教师教育学院'
  ]
}

// 教职工部门
export const STAFF_DEPARTMENTS = [
  '图书馆',
  '教务处',
  '学生处',
  '科研处',
  '人事处',
  '财务处',
  '后勤管理处',
  '保卫处',
  '党委办公室',
  '校长办公室',
  '发展规划处',
  '国际交流处',
  '招生就业处',
  '资产管理处',
  '信息化建设与管理中心'
]

// 常见高校名称（用于地址生成）
export const UNIVERSITY_NAMES = [
  '北京大学',
  '清华大学',
  '复旦大学',
  '上海交通大学',
  '浙江大学',
  '南京大学',
  '中国科学技术大学',
  '武汉大学',
  '华中科技大学',
  '中山大学',
  '西安交通大学',
  '哈尔滨工业大学',
  '同济大学',
  '南开大学',
  '天津大学',
  '东南大学',
  '华东师范大学',
  '北京师范大学',
  '中国人民大学',
  '山东大学',
  '厦门大学',
  '中南大学',
  '四川大学',
  '吉林大学',
  '北京航空航天大学'
]

/**
 * 随机获取院系
 * @param isStudent 是否为学生
 * @returns 院系名称
 */
export function getRandomDepartment(isStudent: boolean = true): string {
  if (!isStudent) {
    return STAFF_DEPARTMENTS[Math.floor(Math.random() * STAFF_DEPARTMENTS.length)]
  }

  // 按权重随机选择学科
  const weights = [35, 20, 15, 15, 5, 5, 5] // 理工、理学、人文、经管、医学、农学、教育
  const categories = Object.keys(UNIVERSITY_DEPARTMENTS) as (keyof typeof UNIVERSITY_DEPARTMENTS)[]

  let random = Math.random() * 100
  let selectedIndex = 0

  for (let i = 0; i < weights.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      selectedIndex = i
      break
    }
  }

  const category = categories[selectedIndex]
  const departments = UNIVERSITY_DEPARTMENTS[category]
  return departments[Math.floor(Math.random() * departments.length)]
}

/**
 * 随机获取高校名称
 */
export function getRandomUniversity(): string {
  return UNIVERSITY_NAMES[Math.floor(Math.random() * UNIVERSITY_NAMES.length)]
}

/**
 * 获取所有院系列表
 */
export function getAllDepartments(): string[] {
  const all: string[] = []
  for (const category in UNIVERSITY_DEPARTMENTS) {
    all.push(...UNIVERSITY_DEPARTMENTS[category as keyof typeof UNIVERSITY_DEPARTMENTS])
  }
  return all
}
