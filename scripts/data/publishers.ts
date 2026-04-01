/**
 * 出版社数据源
 * 包含国内主要出版社列表
 */

export interface Publisher {
  name: string
  location: string
  category: string // 主要出版类别
}

export const PUBLISHERS: Publisher[] = [
  // 计算机科技类
  { name: '机械工业出版社', location: '北京', category: '计算机' },
  { name: '人民邮电出版社', location: '北京', category: '计算机' },
  { name: '电子工业出版社', location: '北京', category: '计算机' },
  { name: '清华大学出版社', location: '北京', category: '计算机' },
  { name: '北京大学出版社', location: '北京', category: '计算机' },
  { name: '科学出版社', location: '北京', category: '科技' },
  { name: '中国电力出版社', location: '北京', category: '计算机' },

  // 文学类
  { name: '人民文学出版社', location: '北京', category: '文学' },
  { name: '作家出版社', location: '北京', category: '文学' },
  { name: '北京十月文艺出版社', location: '北京', category: '文学' },
  { name: '上海译文出版社', location: '上海', category: '文学' },
  { name: '译林出版社', location: '南京', category: '文学' },
  { name: '南海出版公司', location: '海口', category: '文学' },
  { name: '浙江人民出版社', location: '杭州', category: '文学' },
  { name: '上海人民出版社', location: '上海', category: '文学' },
  { name: '中信出版社', location: '北京', category: '综合' },
  { name: '北京联合出版公司', location: '北京', category: '文学' },
  { name: '重庆出版社', location: '重庆', category: '文学' },

  // 历史社科类
  { name: '中华书局', location: '北京', category: '历史' },
  { name: '商务印书馆', location: '北京', category: '历史' },
  { name: '生活·读书·新知三联书店', location: '北京', category: '社科' },
  { name: '华东师范大学出版社', location: '上海', category: '教育' },
  { name: '上海古籍出版社', location: '上海', category: '历史' },
  { name: '中国大百科全书出版社', location: '北京', category: '百科' },
  { name: '新华出版社', location: '北京', category: '社科' },
  { name: '中国社会科学出版社', location: '北京', category: '社科' },

  // 教育类
  { name: '高等教育出版社', location: '北京', category: '教育' },
  { name: '中国人民大学出版社', location: '北京', category: '教育' },
  { name: '北京师范大学出版社', location: '北京', category: '教育' },
  { name: '复旦大学出版社', location: '上海', category: '教育' },
  { name: '南开大学出版社', location: '天津', category: '教育' },

  // 艺术类
  { name: '广西美术出版社', location: '南宁', category: '艺术' },
  { name: '中国青年出版社', location: '北京', category: '艺术' },
  { name: '上海音乐出版社', location: '上海', category: '艺术' },
  { name: '人民音乐出版社', location: '北京', category: '艺术' },
  { name: '上海人民美术出版社', location: '上海', category: '艺术' },
  { name: '中国建筑工业出版社', location: '北京', category: '艺术' },
  { name: '上海书画出版社', location: '上海', category: '艺术' },
  { name: '西南师范大学出版社', location: '重庆', category: '艺术' },

  // 地理类
  { name: '中国地图出版社', location: '北京', category: '地理' },
  { name: '世界图书出版公司', location: '北京', category: '综合' },

  // 科技类
  { name: '湖南科学技术出版社', location: '长沙', category: '科技' },
  { name: '上海译文出版社', location: '上海', category: '科技' },
  { name: '浙江科学技术出版社', location: '杭州', category: '科技' },

  // 其他
  { name: '外语教学与研究出版社', location: '北京', category: '语言' },
  { name: '上海文艺出版社', location: '上海', category: '文学' },
  { name: '中国美术学院出版社', location: '杭州', category: '艺术' },
  { name: '南方出版社', location: '广州', category: '综合' },
  { name: '中国统计出版社', location: '北京', category: '统计' },
  { name: '解放军出版社', location: '北京', category: '军事' },
  { name: '中国少年儿童出版社', location: '北京', category: '少儿' }
]

/**
 * 根据类别获取出版社
 */
export function getPublishersByCategory(category: string): Publisher[] {
  return PUBLISHERS.filter(p => p.category === category)
}

/**
 * 随机获取出版社
 */
export function getRandomPublisher(category?: string): Publisher {
  const pool = category ? getPublishersByCategory(category) : PUBLISHERS
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * 获取出版社名称列表
 */
export function getPublisherNames(): string[] {
  return PUBLISHERS.map(p => p.name)
}
