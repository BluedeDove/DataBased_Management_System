/**
 * 数据库测试数据生成脚本
 *
 * 功能：
 * - 仅生成测试数据，不创建表结构（表结构由应用启动时创建）
 * - 使用真实的中国图书数据
 * - 生成合理的读者和借阅记录
 *
 * 使用方法：
 *   npm run db:generate
 */

import Database from 'better-sqlite3'
import path from 'path'
import { existsSync } from 'fs'
import os from 'os'
import bcrypt from 'bcryptjs'

// 获取数据库路径（兼容独立运行和 Electron 环境）
const userDataPath = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'electron-smart-library')
  : path.join(os.homedir(), '.electron-smart-library')

if (!existsSync(userDataPath)) {
  console.error('❌ 数据库目录不存在，请先启动应用初始化数据库')
  console.log(`   期望路径: ${userDataPath}`)
  process.exit(1)
}

const dbPath = path.join(userDataPath, 'library.db')
const db = new Database(dbPath)

// 启用外键约束
db.pragma('foreign_keys = ON')

console.log('📚 开始生成测试数据...\n')

// ==================== 真实图书数据 ====================

interface BookData {
  title: string
  author: string
  publisher: string
  publishDate: string
  isbn: string
  categoryCode: string
}

const bookData: BookData[] = [
  // 计算机科学类（50本）
  { title: '深入理解计算机系统', author: 'Randal E. Bryant', publisher: '机械工业出版社', publishDate: '2016-11', isbn: '9787111544937', categoryCode: 'TP' },
  { title: '算法导论（第3版）', author: 'Thomas H. Cormen', publisher: '机械工业出版社', publishDate: '2013-01', isbn: '9787111407010', categoryCode: 'TP' },
  { title: 'JavaScript高级程序设计（第4版）', author: 'Matt Frisbie', publisher: '人民邮电出版社', publishDate: '2020-09', isbn: '9787115545381', categoryCode: 'TP' },
  { title: 'Python编程：从入门到实践', author: 'Eric Matthes', publisher: '人民邮电出版社', publishDate: '2016-07', isbn: '9787115428028', categoryCode: 'TP' },
  { title: 'Java核心技术 卷I 基础知识（原书第11版）', author: 'Cay S. Horstmann', publisher: '机械工业出版社', publishDate: '2019-01', isbn: '9787111618495', categoryCode: 'TP' },
  { title: '设计模式：可复用面向对象软件的基础', author: 'Erich Gamma', publisher: '机械工业出版社', publishDate: '2000-09', isbn: '9787111075752', categoryCode: 'TP' },
  { title: '代码整洁之道', author: 'Robert C. Martin', publisher: '人民邮电出版社', publishDate: '2010-01', isbn: '9787115216384', categoryCode: 'TP' },
  { title: '重构：改善既有代码的设计（第2版）', author: 'Martin Fowler', publisher: '人民邮电出版社', publishDate: '2019-03', isbn: '9787115508645', categoryCode: 'TP' },
  { title: '人工智能：一种现代的方法（第4版）', author: 'Stuart Russell', publisher: '清华大学出版社', publishDate: '2021-04', isbn: '9787302574990', categoryCode: 'TP' },
  { title: '深度学习', author: 'Ian Goodfellow', publisher: '人民邮电出版社', publishDate: '2017-07', isbn: '9787115461488', categoryCode: 'TP' },
  { title: '计算机程序设计艺术（第1卷）', author: 'Donald E. Knuth', publisher: '人民邮电出版社', publishDate: '2010-10', isbn: '9787115224471', categoryCode: 'TP' },
  { title: '计算机网络：自顶向下方法（第7版）', author: 'James F. Kurose', publisher: '机械工业出版社', publishDate: '2018-04', isbn: '9787111588000', categoryCode: 'TP' },
  { title: '现代操作系统（第4版）', author: 'Andrew S. Tanenbaum', publisher: '机械工业出版社', publishDate: '2017-07', isbn: '9787111568330', categoryCode: 'TP' },
  { title: '编译原理（第2版）', author: 'Alfred V. Aho', publisher: '人民邮电出版社', publishDate: '2008-12', isbn: '9787115189048', categoryCode: 'TP' },
  { title: '数据库系统概念（第6版）', author: 'Abraham Silberschatz', publisher: '机械工业出版社', publishDate: '2012-03', isbn: '9787111375296', categoryCode: 'TP' },
  { title: 'HTTP权威指南', author: 'David Gourley', publisher: '人民邮电出版社', publishDate: '2012-09', isbn: '9787115284886', categoryCode: 'TP' },
  { title: '鸟哥的Linux私房菜（基础学习篇）', author: '鸟哥', publisher: '人民邮电出版社', publishDate: '2018-08', isbn: '9787115498989', categoryCode: 'TP' },
  { title: '黑客与画家', author: 'Paul Graham', publisher: '人民邮电出版社', publishDate: '2011-04', isbn: '9787115249494', categoryCode: 'TP' },
  { title: '人月神话', author: 'Frederick P. Brooks', publisher: '清华大学出版社', publishDate: '2002-11', isbn: '9787302058166', categoryCode: 'TP' },
  { title: '编程珠玑（第2版）', author: 'Jon Bentley', publisher: '人民邮电出版社', publishDate: '2008-10', isbn: '9787115179669', categoryCode: 'TP' },
  { title: 'C++ Primer（第5版）', author: 'Stanley B. Lippman', publisher: '电子工业出版社', publishDate: '2013-09', isbn: '9787121206276', categoryCode: 'TP' },
  { title: 'Effective Java（第3版）', author: 'Joshua Bloch', publisher: '机械工业出版社', publishDate: '2018-12', isbn: '9787111614772', categoryCode: 'TP' },
  { title: 'Clean Code', author: 'Robert C. Martin', publisher: 'Prentice Hall', publishDate: '2008-08', isbn: '9780132350884', categoryCode: 'TP' },
  { title: '代码大全（第2版）', author: 'Steve McConnell', publisher: '电子工业出版社', publishDate: '2006-03', isbn: '9787121022986', categoryCode: 'TP' },
  { title: 'Vue.js权威指南', author: '张耀', publisher: '电子工业出版社', publishDate: '2017-08', isbn: '9787121323293', categoryCode: 'TP' },
  { title: 'React进阶之路', author: '陈屹', publisher: '人民邮电出版社', publishDate: '2018-05', isbn: '9787115481813', categoryCode: 'TP' },
  { title: 'Node.js实战', author: 'Mike Cantelon', publisher: '人民邮电出版社', publishDate: '2014-01', isbn: '9787115340837', categoryCode: 'TP' },
  { title: 'Go语言实战', author: 'William Kennedy', publisher: '人民邮电出版社', publishDate: '2017-03', isbn: '9787115448359', categoryCode: 'TP' },
  { title: 'Rust编程之道', author: '张汉东', publisher: '电子工业出版社', publishDate: '2019-01', isbn: '9787121358685', categoryCode: 'TP' },
  { title: 'Python数据分析', author: 'Wes McKinney', publisher: '机械工业出版社', publishDate: '2014-01', isbn: '9787111450373', categoryCode: 'TP' },
  { title: '机器学习实战', author: 'Peter Harrington', publisher: '人民邮电出版社', publishDate: '2013-06', isbn: '9787115317971', categoryCode: 'TP' },
  { title: '统计学习方法', author: '李航', publisher: '清华大学出版社', publishDate: '2012-03', isbn: '9787302275954', categoryCode: 'TP' },
  { title: '算法（第4版）', author: 'Robert Sedgewick', publisher: '人民邮电出版社', publishDate: '2012-10', isbn: '9787115293800', categoryCode: 'TP' },
  { title: '数据结构与算法分析', author: 'Mark Allen Weiss', publisher: '机械工业出版社', publishDate: '2016-01', isbn: '9787111520673', categoryCode: 'TP' },
  { title: '操作系统概念（第9版）', author: 'Abraham Silberschatz', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040297266', categoryCode: 'TP' },
  { title: '计算机组成与设计', author: 'David A. Patterson', publisher: '机械工业出版社', publishDate: '2015-08', isbn: '9787111509555', categoryCode: 'TP' },
  { title: '软件工程：实践者的研究方法', author: 'Roger S. Pressman', publisher: '机械工业出版社', publishDate: '2010-09', isbn: '9787111318235', categoryCode: 'TP' },
  { title: '敏捷软件开发', author: 'Robert C. Martin', publisher: '清华大学出版社', publishDate: '2011-01', isbn: '9787302250639', categoryCode: 'TP' },
  { title: '持续集成', author: 'Paul M. Duvall', publisher: '电子工业出版社', publishDate: '2012-01', isbn: '9787121154235', categoryCode: 'TP' },
  { title: 'DevOps实践指南', author: 'Gene Kim', publisher: '人民邮电出版社', publishDate: '2016-05', isbn: '9787115419446', categoryCode: 'TP' },
  { title: 'Docker实战', author: 'James Turnbull', publisher: '人民邮电出版社', publishDate: '2015-01', isbn: '9787115378289', categoryCode: 'TP' },
  { title: 'Kubernetes权威指南', author: '龚正', publisher: '电子工业出版社', publishDate: '2017-09', isbn: '9787121327178', categoryCode: 'TP' },
  { title: '云计算概念、技术与架构', author: 'Thomas Erl', publisher: '机械工业出版社', publishDate: '2014-06', isbn: '9787111468875', categoryCode: 'TP' },
  { title: '大数据时代', author: 'Viktor Mayer-Schönberger', publisher: '浙江人民出版社', publishDate: '2013-01', isbn: '9787213054263', categoryCode: 'TP' },
  { title: 'Hadoop权威指南（第4版）', author: 'Tom White', publisher: '清华大学出版社', publishDate: '2017-01', isbn: '9787302458389', categoryCode: 'TP' },
  { title: 'Spark快速大数据分析', author: 'Holden Karau', publisher: '人民邮电出版社', publishDate: '2015-10', isbn: '9787112409250', categoryCode: 'TP' },
  { title: '数据挖掘：概念与技术', author: 'Jiawei Han', publisher: '机械工业出版社', publishDate: '2012-08', isbn: '9787111389385', categoryCode: 'TP' },
  { title: '信息检索导论', author: 'Christopher D. Manning', publisher: '人民邮电出版社', publishDate: '2010-08', isbn: '9787115234279', categoryCode: 'TP' },
  { title: '自然语言处理综论', author: 'Daniel Jurafsky', publisher: '电子工业出版社', publishDate: '2005-01', isbn: '9787121005606', categoryCode: 'TP' },
  { title: '计算机视觉：算法与应用', author: 'Richard Szeliski', publisher: '清华大学出版社', publishDate: '2012-01', isbn: '9787302269136', categoryCode: 'TP' },

  // 文学类（50本）
  { title: '平凡的世界（全三册）', author: '路遥', publisher: '北京十月文艺出版社', publishDate: '2012-03', isbn: '9787530213978', categoryCode: 'I' },
  { title: '活着', author: '余华', publisher: '作家出版社', publishDate: '2012-08', isbn: '9787506365437', categoryCode: 'I' },
  { title: '红楼梦（上下册）', author: '曹雪芹', publisher: '人民文学出版社', publishDate: '1982-11', isbn: '9787020002207', categoryCode: 'I' },
  { title: '三体（全集）', author: '刘慈欣', publisher: '重庆出版社', publishDate: '2012-01', isbn: '9787536692930', categoryCode: 'I' },
  { title: '百年孤独', author: '加西亚·马尔克斯', publisher: '南海出版公司', publishDate: '2011-06', isbn: '9787544253994', categoryCode: 'I' },
  { title: '1984', author: '乔治·奥威尔', publisher: '北京十月文艺出版社', publishDate: '2010-04', isbn: '9787530210816', categoryCode: 'I' },
  { title: '围城', author: '钱钟书', publisher: '人民文学出版社', publishDate: '1991-02', isbn: '9787020022472', categoryCode: 'I' },
  { title: '追风筝的人', author: '卡勒德·胡赛尼', publisher: '上海人民出版社', publishDate: '2006-05', isbn: '9787208061644', categoryCode: 'I' },
  { title: '白夜行', author: '东野圭吾', publisher: '南海出版公司', publishDate: '2013-01', isbn: '9787544258562', categoryCode: 'I' },
  { title: '骆驼祥子', author: '老舍', publisher: '人民文学出版社', publishDate: '1962-10', isbn: '9787020002207', categoryCode: 'I' },
  { title: '呐喊', author: '鲁迅', publisher: '人民文学出版社', publishDate: '1979-12', isbn: '9787020002207', categoryCode: 'I' },
  { title: '彷徨', author: '鲁迅', publisher: '人民文学出版社', publishDate: '1979-12', isbn: '9787020002207', categoryCode: 'I' },
  { title: '朝花夕拾', author: '鲁迅', publisher: '人民文学出版社', publishDate: '1979-12', isbn: '9787020002207', categoryCode: 'I' },
  { title: '四世同堂', author: '老舍', publisher: '人民文学出版社', publishDate: '1998-01', isbn: '9787020027482', categoryCode: 'I' },
  { title: '边城', author: '沈从文', publisher: '人民文学出版社', publishDate: '2000-01', isbn: '9787020032363', categoryCode: 'I' },
  { title: '呼兰河传', author: '萧红', publisher: '人民文学出版社', publishDate: '2001-01', isbn: '9787020034367', categoryCode: 'I' },
  { title: '倾城之恋', author: '张爱玲', publisher: '北京十月文艺出版社', publishDate: '2009-01', isbn: '9787530210816', categoryCode: 'I' },
  { title: '金锁记', author: '张爱玲', publisher: '北京十月文艺出版社', publishDate: '2009-01', isbn: '9787530210816', categoryCode: 'I' },
  { title: '老人与海', author: '海明威', publisher: '上海译文出版社', publishDate: '2009-01', isbn: '97871152746908', categoryCode: 'I' },
  { title: '了不起的盖茨比', author: 'F.S.菲茨杰拉德', publisher: '上海译文出版社', publishDate: '2011-01', isbn: '97871152752695', categoryCode: 'I' },
  { title: '麦田里的守望者', author: 'J.D.塞林格', publisher: '译林出版社', publishDate: '2010-01', isbn: '9787544712378', categoryCode: 'I' },
  { title: '杀死一只知更鸟', author: '哈珀·李', publisher: '译林出版社', publishDate: '2012-01', isbn: '9787544723458', categoryCode: 'I' },
  { title: '傲慢与偏见', author: '简·奥斯汀', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068221', categoryCode: 'I' },
  { title: '简爱', author: '夏洛蒂·勃朗特', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068238', categoryCode: 'I' },
  { title: '呼啸山庄', author: '艾米莉·勃朗特', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068245', categoryCode: 'I' },
  { title: '复活', author: '托尔斯泰', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068252', categoryCode: 'I' },
  { title: '战争与和平', author: '托尔斯泰', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068269', categoryCode: 'I' },
  { title: '罪与罚', author: '陀思妥耶夫斯基', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068276', categoryCode: 'I' },
  { title: '红与黑', author: '司汤达', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068283', categoryCode: 'I' },
  { title: '巴黎圣母院', author: '雨果', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068290', categoryCode: 'I' },
  { title: '悲惨世界', author: '雨果', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068307', categoryCode: 'I' },
  { title: '茶馆', author: '老舍', publisher: '人民文学出版社', publishDate: '2002-01', isbn: '9787020038428', categoryCode: 'I' },
  { title: '雷雨', author: '曹禺', publisher: '人民文学出版社', publishDate: '2002-01', isbn: '9787020038435', categoryCode: 'I' },
  { title: '牡丹亭', author: '汤显祖', publisher: '人民文学出版社', publishDate: '2002-01', isbn: '9787020038442', categoryCode: 'I' },
  { title: '西厢记', author: '王实甫', publisher: '人民文学出版社', publishDate: '2002-01', isbn: '9787020038459', categoryCode: 'I' },
  { title: '长恨歌', author: '王安忆', publisher: '人民文学出版社', publishDate: '2003-01', isbn: '9787020041237', categoryCode: 'I' },
  { title: '沉默的大多数', author: '王小波', publisher: '北京十月文艺出版社', publishDate: '2011-01', isbn: '9787530210816', categoryCode: 'I' },
  { title: '黄金时代', author: '王小波', publisher: '北京十月文艺出版社', publishDate: '2011-01', isbn: '9787530210816', categoryCode: 'I' },
  { title: '白鹿原', author: '陈忠实', publisher: '人民文学出版社', publishDate: '1993-06', isbn: '9787020017392', categoryCode: 'I' },
  { title: '秦腔', author: '贾平凹', publisher: '作家出版社', publishDate: '2005-04', isbn: '9787506331915', categoryCode: 'I' },
  { title: '废都', author: '贾平凹', publisher: '作家出版社', publishDate: '2009-01', isbn: '9787506345489', categoryCode: 'I' },
  { title: '许三观卖血记', author: '余华', publisher: '作家出版社', publishDate: '2012-08', isbn: '9787506365444', categoryCode: 'I' },
  { title: '在细雨中呼喊', author: '余华', publisher: '作家出版社', publishDate: '2012-08', isbn: '9787506365451', categoryCode: 'I' },
  { title: '第七天', author: '余华', publisher: '作家出版社', publishDate: '2013-06', isbn: '9787506368193', categoryCode: 'I' },
  { title: '兄弟', author: '余华', publisher: '作家出版社', publishDate: '2008-05', isbn: '9787506343233', categoryCode: 'I' },
  { title: '活着（英文版）', author: '余华', publisher: 'Anchor', publishDate: '2003-11', isbn: '9781400032063', categoryCode: 'I' },
  { title: '红高粱家族', author: '莫言', publisher: '作家出版社', publishDate: '2012-10', isbn: '9787506365468', categoryCode: 'I' },
  { title: '丰乳肥臀', author: '莫言', publisher: '作家出版社', publishDate: '2012-10', isbn: '9787506365475', categoryCode: 'I' },
  { title: '檀香刑', author: '莫言', publisher: '作家出版社', publishDate: '2012-10', isbn: '9787506365482', categoryCode: 'I' },
  { title: '蛙', author: '莫言', publisher: '作家出版社', publishDate: '2012-10', isbn: '9787506365499', categoryCode: 'I' },

  // 历史地理类（50本）
  { title: '中国通史', author: '吕思勉', publisher: '华东师范大学出版社', publishDate: '1992-08', isbn: '9787561709362', categoryCode: 'K' },
  { title: '万历十五年', author: '黄仁宇', publisher: '中华书局', publishDate: '2006-08', isbn: '9787101052039', categoryCode: 'K' },
  { title: '人类简史：从动物到上帝', author: '尤瓦尔·赫拉利', publisher: '中信出版社', publishDate: '2014-11', isbn: '9787508647357', categoryCode: 'K' },
  { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', publisher: '上海译文出版社', publishDate: '2006-04', isbn: '9787532737230', categoryCode: 'K' },
  { title: '全球通史', author: '斯塔夫里阿诺斯', publisher: '北京大学出版社', publishDate: '2005-01', isbn: '9787301085366', categoryCode: 'K' },
  { title: '明朝那些事儿（全集）', author: '当年明月', publisher: '浙江人民出版社', publishDate: '2007-03', isbn: '9787213034474', categoryCode: 'K' },
  { title: '苏菲的世界', author: '乔斯坦·贾德', publisher: '作家出版社', publishDate: '2007-10', isbn: '9787506341631', categoryCode: 'K' },
  { title: '中国地理', author: '赵济', publisher: '高等教育出版社', publishDate: '2005-08', isbn: '9787040174188', categoryCode: 'K' },
  { title: '国家地理百科全书', author: '中国大百科全书出版社', publisher: '中国大百科全书出版社', publishDate: '2012-01', isbn: '9787500087366', categoryCode: 'K' },
  { title: '美丽中国', author: '《中国国家地理》杂志社', publisher: '中国大百科全书出版社', publishDate: '2013-09', isbn: '9787500092438', categoryCode: 'K' },
  { title: '史记', author: '司马迁', publisher: '中华书局', publishDate: '2013-01', isbn: '9787101003048', categoryCode: 'K' },
  { title: '资治通鉴', author: '司马光', publisher: '中华书局', publishDate: '2011-01', isbn: '9787101003048', categoryCode: 'K' },
  { title: '汉书', author: '班固', publisher: '中华书局', publishDate: '2012-01', isbn: '9787101003048', categoryCode: 'K' },
  { title: '后汉书', author: '范晔', publisher: '中华书局', publishDate: '2012-01', isbn: '9787101003048', categoryCode: 'K' },
  { title: '三国志', author: '陈寿', publisher: '中华书局', publishDate: '2011-01', isbn: '9787101003048', categoryCode: 'K' },
  { title: '中国古代史', author: '朱绍侯', publisher: '福建人民出版社', publishDate: '2010-01', isbn: '9787211060335', categoryCode: 'K' },
  { title: '中国近代史', author: '蒋廷黻', publisher: '上海古籍出版社', publishDate: '2004-01', isbn: '9787532536788', categoryCode: 'K' },
  { title: '中国现代史', author: '王桧林', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040289135', categoryCode: 'K' },
  { title: '世界通史', author: '吴于廑', publisher: '高等教育出版社', publishDate: '2011-01', isbn: '9787040315625', categoryCode: 'K' },
  { title: '世界近代史', author: '刘宗绪', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040289142', categoryCode: 'K' },
  { title: '世界现代史', author: '齐世荣', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040289159', categoryCode: 'K' },
  { title: '中国文化史', author: '柳诒徵', publisher: '上海古籍出版社', publishDate: '2001-01', isbn: '9787532529643', categoryCode: 'K' },
  { title: '中国哲学史', author: '冯友兰', publisher: '华东师范大学出版社', publishDate: '2011-01', isbn: '9787561784266', categoryCode: 'K' },
  { title: '中国思想史', author: '葛兆光', publisher: '复旦大学出版社', publishDate: '2001-01', isbn: '9787309027654', categoryCode: 'K' },
  { title: '中国社会史', author: '冯尔康', publisher: '南开大学出版社', publishDate: '2004-01', isbn: '9787310020554', categoryCode: 'K' },
  { title: '中国经济史', author: '吴承明', publisher: '中国社会科学出版社', publishDate: '2007-01', isbn: '9787500460099', categoryCode: 'K' },
  { title: '中国政治制度史', author: '钱穆', publisher: '生活·读书·新知三联书店', publishDate: '2001-01', isbn: '9787108015442', categoryCode: 'K' },
  { title: '中国法制史', author: '张晋藩', publisher: '高等教育出版社', publishDate: '2007-01', isbn: '9787040218686', categoryCode: 'K' },
  { title: '中国科技史', author: '李约瑟', publisher: '科学出版社', publishDate: '1990-01', isbn: '9787030016149', categoryCode: 'K' },
  { title: '中国艺术史', author: '徐建融', publisher: '上海人民出版社', publishDate: '2006-01', isbn: '9787208060654', categoryCode: 'K' },
  { title: '中国建筑史', author: '梁思成', publisher: '生活·读书·新知三联书店', publishDate: '2011-01', isbn: '9787108036982', categoryCode: 'K' },
  { title: '中国文学史', author: '袁行霈', publisher: '高等教育出版社', publishDate: '2014-01', isbn: '9787040394836', categoryCode: 'K' },
  { title: '中国民俗学', author: '钟敬文', publisher: '上海文艺出版社', publishDate: '1998-01', isbn: '9787532116789', categoryCode: 'K' },
  { title: '中国民族史', author: '王钟翰', publisher: '中国社会科学出版社', publishDate: '1994-01', isbn: '9787500414179', categoryCode: 'K' },
  { title: '中国宗教史', author: '牟钟鉴', publisher: '中国社会科学出版社', publishDate: '2007-01', isbn: '9787500460105', categoryCode: 'K' },
  { title: '世界文化史', author: '庄锡昌', publisher: '高等教育出版社', publishDate: '2004-01', isbn: '9787040147803', categoryCode: 'K' },
  { title: '世界哲学史', author: '梯利', publisher: '商务印书馆', publishDate: '2004-01', isbn: '9787100039478', categoryCode: 'K' },
  { title: '世界经济史', author: '龙多·卡梅伦', publisher: '上海译文出版社', publishDate: '2013-01', isbn: '9787532760905', categoryCode: 'K' },
  { title: '世界政治史', author: '亨廷顿', publisher: '新华出版社', publishDate: '1999-01', isbn: '9787501142815', categoryCode: 'K' },
  { title: '世界军事史', author: '杜普伊', publisher: '解放军出版社', publishDate: '2006-01', isbn: '9787506550274', categoryCode: 'K' },
  { title: '世界科技史', author: '李约瑟', publisher: '科学出版社', publishDate: '1990-01', isbn: '9787030016149', categoryCode: 'K' },
  { title: '世界艺术史', author: '休·昂纳', publisher: '南方出版社', publishDate: '2014-01', isbn: '9787550117986', categoryCode: 'K' },
  { title: '世界建筑史', author: '肯尼思·弗兰姆普敦', publisher: '中国建筑工业出版社', publishDate: '2007-01', isbn: '9787112089367', categoryCode: 'K' },
  { title: '世界文学史', author: '郑克鲁', publisher: '华东师范大学出版社', publishDate: '2000-01', isbn: '9787561722663', categoryCode: 'K' },
  { title: '世界民俗学', author: '邓迪斯', publisher: '上海文艺出版社', publishDate: '2006-01', isbn: '9787532139893', categoryCode: 'K' },
  { title: '世界民族史', author: '斯塔克', publisher: '中国社会科学出版社', publishDate: '2006-01', isbn: '9787500455163', categoryCode: 'K' },
  { title: '世界宗教史', author: '埃里克·J·夏普', publisher: '上海人民出版社', publishDate: '2004-01', isbn: '9787208051805', categoryCode: 'K' },
  { title: '中国地图册', author: '中国地图出版社', publisher: '中国地图出版社', publishDate: '2015-01', isbn: '9787503186558', categoryCode: 'K' },
  { title: '世界地图册', author: '中国地图出版社', publisher: '中国地图出版社', publishDate: '2015-01', isbn: '9787503186565', categoryCode: 'K' },
  { title: '地理学与生活', author: '阿瑟·格蒂斯', publisher: '世界图书出版公司', publishDate: '2013-01', isbn: '9787510059159', categoryCode: 'K' },

  // 数理科学类（30本）
  { title: '高等数学（第七版）', author: '同济大学数学系', publisher: '高等教育出版社', publishDate: '2014-07', isbn: '9787040396638', categoryCode: 'O' },
  { title: '线性代数（第五版）', author: '同济大学数学系', publisher: '高等教育出版社', publishDate: '2007-05', isbn: '9787040207468', categoryCode: 'O' },
  { title: '概率论与数理统计（第四版）', author: '浙江大学', publisher: '高等教育出版社', publishDate: '2008-06', isbn: '9787040239605', categoryCode: 'O' },
  { title: '数学分析（第四版）', author: '华东师范大学数学系', publisher: '高等教育出版社', publishDate: '2010-07', isbn: '9787040295665', categoryCode: 'O' },
  { title: '时间简史', author: '史蒂芬·霍金', publisher: '湖南科学技术出版社', publishDate: '2010-04', isbn: '9787535726593', categoryCode: 'O' },
  { title: '物理学（第五版）', author: '程守洙', publisher: '高等教育出版社', publishDate: '1998-06', isbn: '9787040064566', categoryCode: 'O' },
  { title: '普通生物学（第四版）', author: '陈阅增', publisher: '高等教育出版社', publishDate: '2014-08', isbn: '9787040409132', categoryCode: 'O' },
  { title: '化学原理', author: '朱文祥', publisher: '高等教育出版社', publishDate: '2011-06', isbn: '9787040322274', categoryCode: 'O' },
  { title: '什么是数学', author: 'R·柯朗', publisher: '复旦大学出版社', publishDate: '2005-03', isbn: '9787309044949', categoryCode: 'O' },
  { title: '数学之美', author: '吴军', publisher: '人民邮电出版社', publishDate: '2012-05', isbn: '9787115282828', categoryCode: 'O' },
  { title: '离散数学', author: '屈婉玲', publisher: '高等教育出版社', publishDate: '2008-03', isbn: '9787040235478', categoryCode: 'O' },
  { title: '复变函数论', author: '钟玉泉', publisher: '高等教育出版社', publishDate: '2013-01', isbn: '9787040365519', categoryCode: 'O' },
  { title: '实变函数论', author: '周民强', publisher: '北京大学出版社', publishDate: '2008-01', isbn: '9787301133755', categoryCode: 'O' },
  { title: '泛函分析讲义', author: '张恭庆', publisher: '北京大学出版社', publishDate: '2006-01', isbn: '9787301108233', categoryCode: 'O' },
  { title: '微分几何', author: '陈维桓', publisher: '北京大学出版社', publishDate: '2006-01', isbn: '9787301108240', categoryCode: 'O' },
  { title: '拓扑学', author: '尤承业', publisher: '北京大学出版社', publishDate: '2006-01', isbn: '9787301108257', categoryCode: 'O' },
  { title: '数理方程', author: '谷超豪', publisher: '高等教育出版社', publishDate: '2002-01', isbn: '9787040105329', categoryCode: 'O' },
  { title: '运筹学', author: '《运筹学》教材编写组', publisher: '清华大学出版社', publishDate: '2005-01', isbn: '9787302105524', categoryCode: 'O' },
  { title: '数值分析', author: '李庆扬', publisher: '清华大学出版社', publishDate: '2008-01', isbn: '9787302172663', categoryCode: 'O' },
  { title: '优化方法', author: '袁亚湘', publisher: '科学出版社', publishDate: '1997-01', isbn: '9787030057758', categoryCode: 'O' },
  { title: '统计学', author: '贾俊平', publisher: '中国人民大学出版社', publishDate: '2012-01', isbn: '9787300154559', categoryCode: 'O' },
  { title: '回归分析', author: '何晓群', publisher: '中国人民大学出版社', publishDate: '2012-01', isbn: '9787300154566', categoryCode: 'O' },
  { title: '时间序列分析', author: '王振龙', publisher: '中国统计出版社', publishDate: '2000-01', isbn: '9787503732575', categoryCode: 'O' },
  { title: '多元统计分析', author: '何晓群', publisher: '中国人民大学出版社', publishDate: '2012-01', isbn: '9787300154573', categoryCode: 'O' },
  { title: '随机过程', author: '刘次华', publisher: '高等教育出版社', publishDate: '2004-01', isbn: '9787040137373', categoryCode: 'O' },
  { title: '数理统计', author: '茆诗松', publisher: '高等教育出版社', publishDate: '2006-01', isbn: '9787040198360', categoryCode: 'O' },
  { title: '应用回归分析', author: '何晓群', publisher: '中国人民大学出版社', publishDate: '2012-01', isbn: '9787300154580', categoryCode: 'O' },
  { title: '概率论与数理统计习题集', author: '浙江大学', publisher: '高等教育出版社', publishDate: '2008-06', isbn: '9787040239612', categoryCode: 'O' },
  { title: '高等数学习题集', author: '同济大学数学系', publisher: '高等教育出版社', publishDate: '2014-07', isbn: '9787040396645', categoryCode: 'O' },
  { title: '线性代数习题集', author: '同济大学数学系', publisher: '高等教育出版社', publishDate: '2007-05', isbn: '9787040207475', categoryCode: 'O' },

  // 艺术类（20本）
  { title: '艺术的故事', author: 'E.H.贡布里希', publisher: '广西美术出版社', publishDate: '2008-01', isbn: '9787806749477', categoryCode: 'J' },
  { title: '写给大家看的设计书', author: 'Robin Williams', publisher: '人民邮电出版社', publishDate: '2009-01', isbn: '9787115198266', categoryCode: 'J' },
  { title: '配色设计原理', author: '日本奥博斯科', publisher: '中国青年出版社', publishDate: '2009-03', isbn: '9787500687367', categoryCode: 'J' },
  { title: '美术鉴赏', author: '李新生', publisher: '高等教育出版社', publishDate: '2006-08', isbn: '9787040198377', categoryCode: 'J' },
  { title: '音乐欣赏', author: '王安国', publisher: '上海音乐出版社', publishDate: '2005-06', isbn: '9787806675433', categoryCode: 'J' },
  { title: '西方美术史', author: '加德纳', publisher: '中国人民大学出版社', publishDate: '2008-01', isbn: '9787300088385', categoryCode: 'J' },
  { title: '中国美术史', author: '洪再新', publisher: '中国美术学院出版社', publishDate: '2000-03', isbn: '9787810191777', categoryCode: 'J' },
  { title: '电影艺术', author: '大卫·波德维尔', publisher: '北京大学出版社', publishDate: '2003-01', isbn: '9787301063525', categoryCode: 'J' },
  { title: '设计心理学', author: '唐纳德·诺曼', publisher: '中信出版社', publishDate: '2010-03', isbn: '9787508619706', categoryCode: 'J' },
  { title: '建筑形式语言', author: '刘先觉', publisher: '中国建筑工业出版社', publishDate: '2005-06', isbn: '9787112073286', categoryCode: 'J' },
  { title: '色彩心理学', author: '小林重顺', publisher: '人民邮电出版社', publishDate: '2006-01', isbn: '9787115143214', categoryCode: 'J' },
  { title: '构图学', author: '李巍', publisher: '西南师范大学出版社', publishDate: '2006-01', isbn: '9787562135675', categoryCode: 'J' },
  { title: '书法鉴赏', author: '欧阳中石', publisher: '高等教育出版社', publishDate: '2007-01', isbn: '9787040218693', categoryCode: 'J' },
  { title: '绘画鉴赏', author: '徐建融', publisher: '上海人民美术出版社', publishDate: '2005-01', isbn: '9787532243269', categoryCode: 'J' },
  { title: '摄影艺术', author: '顾铮', publisher: '上海人民美术出版社', publishDate: '2006-01', isbn: '9787532239873', categoryCode: 'J' },
  { title: '雕塑艺术', author: '孙振华', publisher: '上海书画出版社', publishDate: '2005-01', isbn: '9787807250892', categoryCode: 'J' },
  { title: '音乐理论基础', author: '李重光', publisher: '人民音乐出版社', publishDate: '2000-01', isbn: '9787103006900', categoryCode: 'J' },
  { title: '西方音乐史', author: '于润洋', publisher: '上海音乐出版社', publishDate: '2003-01', isbn: '9787806672241', categoryCode: 'J' },
  { title: '中国音乐史', author: '杨荫浏', publisher: '人民音乐出版社', publishDate: '1981-01', isbn: '9787103006900', categoryCode: 'J' },
  { title: '世界电影史', author: '克莉丝汀·汤普森', publisher: '北京大学出版社', publishDate: '2004-01', isbn: '9787301071230', categoryCode: 'J' }
]

// ==================== 辅助函数 ====================

// 检查表是否存在
function tableExists(tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName)
  return !!result
}

// 安全地删除表数据（表存在时才执行）
function safeDelete(tableName: string, condition: string = '') {
  if (!tableExists(tableName)) {
    return
  }
  try {
    const sql = condition ? `DELETE FROM ${tableName} WHERE ${condition}` : `DELETE FROM ${tableName}`
    db.exec(sql)
  } catch (error) {
    // 忽略删除错误
    console.warn(`  ⚠️  删除表 ${tableName} 数据时出现警告: ${error}`)
  }
}

// ==================== 生成数据 ====================

// 1. 清理现有数据
console.log('🧹 清理现有数据...')
safeDelete('borrowing_records')
safeDelete('books') // 删除所有图书数据
safeDelete('users', 'id > 1') // 保留admin账号
safeDelete('readers', 'id > 0')
safeDelete('ai_conversations', 'user_id > 1') // 清理admin以外的对话
safeDelete('book_vectors') // 清理向量数据
safeDelete('operation_logs') // 清理操作日志
safeDelete('audit_logs') // 清理审计日志
console.log('✅ 清理完成\n')

// 2. 生成图书数据
console.log('📚 生成图书数据...')
if (!tableExists('book_categories')) {
  console.error('❌ 图书类别表不存在，请先启动应用初始化数据库')
  process.exit(1)
}

const bookCategories = db.prepare('SELECT * FROM book_categories').all()

// 使用 INSERT OR REPLACE 处理重复的 ISBN
const insertBook = db.prepare(`
  INSERT OR REPLACE INTO books (isbn, title, author, publisher, category_id, publish_date, price, pages,
                              keywords, description, cover_url, total_quantity, available_quantity,
                              status, registration_date, is_deleted)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), 0)
`)

const insertBookTransaction = db.transaction((count: number) => {
  for (let i = 0; i < count; i++) {
    const bookInfo = bookData[i % bookData.length]
    const category = bookCategories.find((c: any) => c.code === bookInfo.categoryCode) || bookCategories[0]

    // 随机价格和页数
    const price = (Math.random() * 150 + 30).toFixed(2)
    const pages = Math.floor(Math.random() * 500) + 100
    const quantity = Math.floor(Math.random() * 5) + 1

    const keywords = `${(category as any).name},${bookInfo.author},热门`
    const description = `这是一本关于${(category as any).name}的优秀图书，由${bookInfo.author}撰写，${bookInfo.publisher}出版。`
    const coverUrl = Math.random() < 0.3 ? `https://picsum.photos/seed/${i}/300/400` : null

    insertBook.run(
      bookInfo.isbn,
      bookInfo.title,
      bookInfo.author,
      bookInfo.publisher,
      (category as any).id,
      bookInfo.publishDate,
      price,
      pages,
      keywords,
      description,
      coverUrl,
      quantity,
      quantity,
      'normal'
    )
  }
})

insertBookTransaction(200)
console.log('✅ 生成了 200 本图书\n')

// 3. 生成读者和用户数据
console.log('👥 生成读者和用户数据...')
if (!tableExists('reader_categories')) {
  console.error('❌ 读者类别表不存在，请先启动应用初始化数据库')
  process.exit(1)
}

const readerCategories = db.prepare('SELECT * FROM reader_categories').all()

const surnames = ['张', '李', '王', '赵', '钱', '孙', '周', '吴', '郑', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨']
const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '娟']
const organizations = ['计算机学院', '软件学院', '数学学院', '物理学院', '文学院', '历史学院', '化学学院', '生命科学学院']

const insertReader = db.prepare(`
  INSERT INTO readers (reader_no, name, category_id, user_id, gender, id_card, organization,
                       phone, email, address, status, registration_date, expiry_date, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', date('now'), date('now', '+1 year'), ?)
`)

const insertUser = db.prepare(`
  INSERT INTO users (username, password, name, role, reader_id, email, phone, is_deleted)
  VALUES (?, ?, ?, ?, ?, ?, ?, 0)
`)

const updateReaderUserId = db.prepare(`
  UPDATE readers SET user_id = ? WHERE id = ?
`)

const generateReaderNo = (categoryCode: string, sequence: number) => {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
  return `${categoryCode}${dateStr}${sequence.toString().padStart(4, '0')}`
}

const insertReaderAndUserTransaction = db.transaction((count: number) => {
  let teacherSeq = 1
  let studentSeq = 1

  for (let i = 0; i < count; i++) {
    const category = readerCategories[i % readerCategories.length]
    const isTeacher = (category as any).code === 'TEACHER'
    const isStudent = (category as any).code === 'STUDENT'

    let role: string
    let readerNoPrefix: string
    let sequence: number

    if (isTeacher) {
      role = 'teacher'
      readerNoPrefix = 'TEACHER'
      sequence = teacherSeq++
    } else if (isStudent) {
      role = 'student'
      readerNoPrefix = 'STUDENT'
      sequence = studentSeq++
    } else {
      role = 'student'
      readerNoPrefix = 'STUDENT'
      sequence = studentSeq++
    }

    const readerNo = generateReaderNo(readerNoPrefix, sequence)
    const name = surnames[Math.floor(Math.random() * surnames.length)] +
                 names[Math.floor(Math.random() * names.length)] +
                 names[Math.floor(Math.random() * names.length)]
    const username = `${role}${String(i + 1).padStart(3, '0')}`
    const password = bcrypt.hashSync('123456', 10)
    const gender = Math.random() > 0.5 ? 'male' : 'female'
    const idCard = `${110101}${1990 + Math.floor(Math.random() * 15)}${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}X`
    const organization = isTeacher ? '教职工' : organizations[Math.floor(Math.random() * organizations.length)]
    const phone = `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
    const email = `${username}@example.com`
    const address = `北京市海淀区中关村大街${Math.floor(Math.random() * 200) + 1}号`
    const notes = `${(category as any).name}读者`

    const readerResult = insertReader.run(
      readerNo, name, (category as any).id, null, gender, idCard, organization,
      phone, email, address, notes
    )
    const readerId = readerResult.lastInsertRowid as number

    const userResult = insertUser.run(
      username, password, name, role, readerId, email, phone
    )
    const userId = userResult.lastInsertRowid as number

    updateReaderUserId.run(userId, readerId)
  }
})

insertReaderAndUserTransaction(50)
console.log('✅ 生成了 50 个读者和用户（双向关联）')
console.log('   - 默认密码: 123456')
console.log('   - 用户名格式: teacher001, student001, etc.\n')

// 4. 生成借阅记录
console.log('📖 生成借阅记录...')
const readers = db.prepare('SELECT * FROM readers').all()
const books = db.prepare('SELECT * FROM books').all()

const insertBorrowing = db.prepare(`
  INSERT INTO borrowing_records (reader_id, book_id, borrow_date, due_date, return_date,
                                  renewal_count, status, fine_amount, is_deleted)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
`)

const updateBookQuantity = db.prepare(`
  UPDATE books
  SET available_quantity = available_quantity - 1,
      updated_at = CURRENT_TIMESTAMP,
      version = version + 1
  WHERE id = ? AND available_quantity >= 1
`)

const insertBorrowingTransaction = db.transaction((count: number) => {
  const usedPairs = new Set<string>()

  for (let i = 0; i < count; i++) {
    let reader: any, book: any, pairKey: string
    let attempts = 0
    do {
      reader = readers[Math.floor(Math.random() * readers.length)]
      book = books[Math.floor(Math.random() * books.length)]
      pairKey = `${reader.id}-${book.id}`
      attempts++
      if (attempts > 50) break
    } while (usedPairs.has(pairKey))

    if (usedPairs.has(pairKey)) continue
    usedPairs.add(pairKey)

    const readerCategory = readerCategories.find((c: any) => c.id === reader.category_id)
    const borrowDays = readerCategory ? (readerCategory as any).max_borrow_days : 30

    const daysAgo = Math.floor(Math.random() * 90)
    const borrowDate = new Date()
    borrowDate.setDate(borrowDate.getDate() - daysAgo)
    const borrowDateStr = borrowDate.toISOString().split('T')[0]

    const dueDate = new Date(borrowDate)
    dueDate.setDate(dueDate.getDate() + borrowDays)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    const rand = Math.random()
    let status: string, returnDate: string | null, renewalCount: number, fineAmount: number

    if (rand < 0.4) {
      status = 'returned'
      const returnDay = Math.floor(Math.random() * borrowDays)
      const returnDateObj = new Date(borrowDate)
      returnDateObj.setDate(returnDateObj.getDate() + returnDay)
      returnDate = returnDateObj.toISOString().split('T')[0]
      renewalCount = Math.floor(Math.random() * 2)
      fineAmount = 0
    } else if (rand < 0.6) {
      status = 'returned'
      const overdueDays = Math.floor(Math.random() * 15) + 1
      const returnDateObj = new Date(dueDate)
      returnDateObj.setDate(returnDateObj.getDate() + overdueDays)
      returnDate = returnDateObj.toISOString().split('T')[0]
      renewalCount = Math.floor(Math.random() * 3)
      fineAmount = overdueDays * 0.1
    } else if (rand < 0.8) {
      status = 'borrowed'
      returnDate = null
      renewalCount = Math.floor(Math.random() * 2)
      fineAmount = 0
      updateBookQuantity.run(book.id)
    } else {
      status = 'overdue'
      returnDate = null
      renewalCount = Math.floor(Math.random() * 3)
      const overdueDays = Math.max(0, Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      fineAmount = overdueDays * 0.1
      updateBookQuantity.run(book.id)
    }

    insertBorrowing.run(reader.id, book.id, borrowDateStr, dueDateStr, returnDate,
      renewalCount, status, fineAmount)
  }
})

insertBorrowingTransaction(150)
console.log('✅ 生成了 150 条借阅记录')
console.log('   - 正常归还: ~60 条')
console.log('   - 逾期归还: ~30 条')
console.log('   - 借阅中: ~30 条')
console.log('   - 逾期未还: ~30 条\n')

// 5. 统计信息
console.log('📊 数据统计:')
const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any
const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get() as any
const totalReaders = db.prepare('SELECT COUNT(*) as count FROM readers').get() as any
const totalBorrowings = db.prepare('SELECT COUNT(*) as count FROM borrowing_records').get() as any
const activeBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'borrowed' OR status = 'overdue'").get() as any
const overdueBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'overdue'").get() as any
const totalFine = db.prepare('SELECT SUM(fine_amount) as total FROM borrowing_records').get() as any

console.log(`   用户总数: ${totalUsers.count}`)
console.log(`   图书总数: ${totalBooks.count}`)
console.log(`   读者总数: ${totalReaders.count}`)
console.log(`   借阅记录: ${totalBorrowings.count}`)
console.log(`   进行中: ${activeBorrowings.count}`)
console.log(`   逾期未还: ${overdueBorrowings.count}`)
console.log(`   总罚款: ¥${(totalFine.total || 0).toFixed(2)}`)

console.log('\n✅ 测试数据生成完成！')
console.log('💡 提示: 若应用正在运行，直接刷新页面即可查看生成的数据，无需重启')
console.log('📝 默认账号:')
console.log('   - 管理员: admin / admin123')
console.log('   - 图书管理员: librarian / lib123')
console.log('   - 教师: teacher001 / 123456')
console.log('   - 学生: student001 / 123456')

db.close()
process.exit(0)
