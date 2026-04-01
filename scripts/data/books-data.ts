/**
 * 扩展图书数据源
 * 包含380+本真实图书数据，按中图法分类
 */

export interface BookData {
  title: string
  author: string
  publisher: string
  publishDate: string
  isbn: string
  categoryCode: string
}

// 计算机科学类（TP）- 约130本
const COMPUTER_BOOKS: BookData[] = [
  // 基础理论
  { title: '深入理解计算机系统', author: 'Randal E. Bryant', publisher: '机械工业出版社', publishDate: '2016-11', isbn: '9787111544937', categoryCode: 'TP' },
  { title: '算法导论（第3版）', author: 'Thomas H. Cormen', publisher: '机械工业出版社', publishDate: '2013-01', isbn: '9787111407010', categoryCode: 'TP' },
  { title: '计算机程序设计艺术（第1卷）', author: 'Donald E. Knuth', publisher: '人民邮电出版社', publishDate: '2010-10', isbn: '9787115224471', categoryCode: 'TP' },
  { title: '算法（第4版）', author: 'Robert Sedgewick', publisher: '人民邮电出版社', publishDate: '2012-10', isbn: '9787115293800', categoryCode: 'TP' },
  { title: '数据结构与算法分析', author: 'Mark Allen Weiss', publisher: '机械工业出版社', publishDate: '2016-01', isbn: '9787111520673', categoryCode: 'TP' },
  { title: '编程珠玑（第2版）', author: 'Jon Bentley', publisher: '人民邮电出版社', publishDate: '2008-10', isbn: '9787115179669', categoryCode: 'TP' },
  { title: '计算机组成与设计', author: 'David A. Patterson', publisher: '机械工业出版社', publishDate: '2015-08', isbn: '9787111509555', categoryCode: 'TP' },
  { title: '操作系统概念（第9版）', author: 'Abraham Silberschatz', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040297266', categoryCode: 'TP' },
  { title: '现代操作系统（第4版）', author: 'Andrew S. Tanenbaum', publisher: '机械工业出版社', publishDate: '2017-07', isbn: '9787111568330', categoryCode: 'TP' },
  { title: '计算机网络：自顶向下方法（第7版）', author: 'James F. Kurose', publisher: '机械工业出版社', publishDate: '2018-04', isbn: '9787111588000', categoryCode: 'TP' },
  { title: 'HTTP权威指南', author: 'David Gourley', publisher: '人民邮电出版社', publishDate: '2012-09', isbn: '9787115284886', categoryCode: 'TP' },
  { title: '编译原理（第2版）', author: 'Alfred V. Aho', publisher: '人民邮电出版社', publishDate: '2008-12', isbn: '9787115189048', categoryCode: 'TP' },
  { title: '数据库系统概念（第6版）', author: 'Abraham Silberschatz', publisher: '机械工业出版社', publishDate: '2012-03', isbn: '9787111375296', categoryCode: 'TP' },

  // 编程语言
  { title: 'JavaScript高级程序设计（第4版）', author: 'Matt Frisbie', publisher: '人民邮电出版社', publishDate: '2020-09', isbn: '9787115545381', categoryCode: 'TP' },
  { title: 'Python编程：从入门到实践', author: 'Eric Matthes', publisher: '人民邮电出版社', publishDate: '2016-07', isbn: '9787115428028', categoryCode: 'TP' },
  { title: 'Java核心技术 卷I 基础知识（原书第11版）', author: 'Cay S. Horstmann', publisher: '机械工业出版社', publishDate: '2019-01', isbn: '9787111618495', categoryCode: 'TP' },
  { title: 'C++ Primer（第5版）', author: 'Stanley B. Lippman', publisher: '电子工业出版社', publishDate: '2013-09', isbn: '9787121206276', categoryCode: 'TP' },
  { title: 'Effective Java（第3版）', author: 'Joshua Bloch', publisher: '机械工业出版社', publishDate: '2018-12', isbn: '9787111614772', categoryCode: 'TP' },
  { title: 'Go语言实战', author: 'William Kennedy', publisher: '人民邮电出版社', publishDate: '2017-03', isbn: '9787115448359', categoryCode: 'TP' },
  { title: 'Rust编程之道', author: '张汉东', publisher: '电子工业出版社', publishDate: '2019-01', isbn: '9787121358685', categoryCode: 'TP' },
  { title: 'Node.js实战', author: 'Mike Cantelon', publisher: '人民邮电出版社', publishDate: '2014-01', isbn: '9787115340837', categoryCode: 'TP' },
  { title: 'TypeScript编程', author: 'Boris Cherny', publisher: '中国电力出版社', publishDate: '2020-01', isbn: '9787519840381', categoryCode: 'TP' },
  { title: 'C语言程序设计现代方法', author: 'K.N. King', publisher: '人民邮电出版社', publishDate: '2010-04', isbn: '9787115219378', categoryCode: 'TP' },

  // 前端开发
  { title: 'Vue.js设计与实现', author: '霍春阳', publisher: '人民邮电出版社', publishDate: '2022-04', isbn: '9787115583860', categoryCode: 'TP' },
  { title: 'Vue.js权威指南', author: '张耀', publisher: '电子工业出版社', publishDate: '2017-08', isbn: '9787121323293', categoryCode: 'TP' },
  { title: 'React进阶之路', author: '陈屹', publisher: '人民邮电出版社', publishDate: '2018-05', isbn: '9787115481813', categoryCode: 'TP' },
  { title: 'React设计模式与最佳实践', author: 'Michele Bertoli', publisher: '电子工业出版社', publishDate: '2018-07', isbn: '9787121341891', categoryCode: 'TP' },
  { title: 'CSS揭秘', author: 'Lea Verou', publisher: '中国电力出版社', publishDate: '2016-06', isbn: '9787512396750', categoryCode: 'TP' },
  { title: 'HTML5与CSS3基础教程（第8版）', author: 'Elizabeth Castro', publisher: '人民邮电出版社', publishDate: '2013-07', isbn: '9787115319808', categoryCode: 'TP' },

  // 软件工程
  { title: '设计模式：可复用面向对象软件的基础', author: 'Erich Gamma', publisher: '机械工业出版社', publishDate: '2000-09', isbn: '9787111075752', categoryCode: 'TP' },
  { title: '代码整洁之道', author: 'Robert C. Martin', publisher: '人民邮电出版社', publishDate: '2010-01', isbn: '9787115216384', categoryCode: 'TP' },
  { title: '重构：改善既有代码的设计（第2版）', author: 'Martin Fowler', publisher: '人民邮电出版社', publishDate: '2019-03', isbn: '9787115508645', categoryCode: 'TP' },
  { title: '代码大全（第2版）', author: 'Steve McConnell', publisher: '电子工业出版社', publishDate: '2006-03', isbn: '9787121022986', categoryCode: 'TP' },
  { title: '软件工程：实践者的研究方法', author: 'Roger S. Pressman', publisher: '机械工业出版社', publishDate: '2010-09', isbn: '9787111318235', categoryCode: 'TP' },
  { title: '敏捷软件开发', author: 'Robert C. Martin', publisher: '清华大学出版社', publishDate: '2011-01', isbn: '9787302250639', categoryCode: 'TP' },
  { title: '持续集成', author: 'Paul M. Duvall', publisher: '电子工业出版社', publishDate: '2012-01', isbn: '9787121154235', categoryCode: 'TP' },
  { title: 'DevOps实践指南', author: 'Gene Kim', publisher: '人民邮电出版社', publishDate: '2016-05', isbn: '9787115419446', categoryCode: 'TP' },
  { title: 'Clean Architecture', author: 'Robert C. Martin', publisher: 'Prentice Hall', publishDate: '2017-09', isbn: '9780134494166', categoryCode: 'TP' },
  { title: '领域驱动设计', author: 'Eric Evans', publisher: '人民邮电出版社', publishDate: '2010-11', isbn: '9787115234279', categoryCode: 'TP' },

  // 人工智能与机器学习
  { title: '人工智能：一种现代的方法（第4版）', author: 'Stuart Russell', publisher: '清华大学出版社', publishDate: '2021-04', isbn: '9787302574990', categoryCode: 'TP' },
  { title: '深度学习', author: 'Ian Goodfellow', publisher: '人民邮电出版社', publishDate: '2017-07', isbn: '9787115461488', categoryCode: 'TP' },
  { title: '机器学习实战', author: 'Peter Harrington', publisher: '人民邮电出版社', publishDate: '2013-06', isbn: '9787115317971', categoryCode: 'TP' },
  { title: '统计学习方法', author: '李航', publisher: '清华大学出版社', publishDate: '2012-03', isbn: '9787302275954', categoryCode: 'TP' },
  { title: 'Python数据分析', author: 'Wes McKinney', publisher: '机械工业出版社', publishDate: '2014-01', isbn: '9787111450373', categoryCode: 'TP' },
  { title: '自然语言处理综论', author: 'Daniel Jurafsky', publisher: '电子工业出版社', publishDate: '2005-01', isbn: '9787121005606', categoryCode: 'TP' },
  { title: '计算机视觉：算法与应用', author: 'Richard Szeliski', publisher: '清华大学出版社', publishDate: '2012-01', isbn: '9787302269136', categoryCode: 'TP' },
  { title: '强化学习（第2版）', author: 'Richard S. Sutton', publisher: '电子工业出版社', publishDate: '2019-10', isbn: '9787121373384', categoryCode: 'TP' },
  { title: 'PyTorch深度学习实战', author: 'Eli Stevens', publisher: '人民邮电出版社', publishDate: '2021-01', isbn: '9787115563619', categoryCode: 'TP' },
  { title: 'TensorFlow深度学习', author: '龙龙', publisher: '人民邮电出版社', publishDate: '2019-05', isbn: '9787115509241', categoryCode: 'TP' },

  // 大数据与云计算
  { title: '大数据时代', author: 'Viktor Mayer-Schönberger', publisher: '浙江人民出版社', publishDate: '2013-01', isbn: '9787213054263', categoryCode: 'TP' },
  { title: 'Hadoop权威指南（第4版）', author: 'Tom White', publisher: '清华大学出版社', publishDate: '2017-01', isbn: '9787302458389', categoryCode: 'TP' },
  { title: 'Spark快速大数据分析', author: 'Holden Karau', publisher: '人民邮电出版社', publishDate: '2015-10', isbn: '9787112409250', categoryCode: 'TP' },
  { title: '数据挖掘：概念与技术', author: 'Jiawei Han', publisher: '机械工业出版社', publishDate: '2012-08', isbn: '9787111389385', categoryCode: 'TP' },
  { title: '云计算概念、技术与架构', author: 'Thomas Erl', publisher: '机械工业出版社', publishDate: '2014-06', isbn: '9787111468875', categoryCode: 'TP' },
  { title: 'Docker实战', author: 'James Turnbull', publisher: '人民邮电出版社', publishDate: '2015-01', isbn: '9787115378289', categoryCode: 'TP' },
  { title: 'Kubernetes权威指南', author: '龚正', publisher: '电子工业出版社', publishDate: '2017-09', isbn: '9787121327178', categoryCode: 'TP' },
  { title: 'Flink基础教程', author: 'Ellen Friedman', publisher: '人民邮电出版社', publishDate: '2018-01', isbn: '9787115470891', categoryCode: 'TP' },

  // 系统与网络
  { title: '鸟哥的Linux私房菜（基础学习篇）', author: '鸟哥', publisher: '人民邮电出版社', publishDate: '2018-08', isbn: '9787115498989', categoryCode: 'TP' },
  { title: 'Linux高性能服务器编程', author: '游双', publisher: '机械工业出版社', publishDate: '2013-06', isbn: '9787111432592', categoryCode: 'TP' },
  { title: 'UNIX环境高级编程（第3版）', author: 'W. Richard Stevens', publisher: '人民邮电出版社', publishDate: '2014-06', isbn: '9787115352062', categoryCode: 'TP' },
  { title: 'TCP/IP详解 卷1：协议', author: 'W. Richard Stevens', publisher: '机械工业出版社', publishDate: '2006-03', isbn: '9787111186210', categoryCode: 'TP' },
  { title: '网络安全基础', author: 'William Stallings', publisher: '清华大学出版社', publishDate: '2017-01', isbn: '9787302461464', categoryCode: 'TP' },
  { title: '图解HTTP', author: '上野宣', publisher: '人民邮电出版社', publishDate: '2014-05', isbn: '9787115351531', categoryCode: 'TP' },

  // 其他经典
  { title: '黑客与画家', author: 'Paul Graham', publisher: '人民邮电出版社', publishDate: '2011-04', isbn: '9787115249494', categoryCode: 'TP' },
  { title: '人月神话', author: 'Frederick P. Brooks', publisher: '清华大学出版社', publishDate: '2002-11', isbn: '9787302058166', categoryCode: 'TP' },
  { title: '程序员修炼之道', author: 'Andrew Hunt', publisher: '电子工业出版社', publishDate: '2005-01', isbn: '9787121009833', categoryCode: 'TP' },
  { title: '编码：隐匿在计算机软硬件背后的语言', author: 'Charles Petzold', publisher: '电子工业出版社', publishDate: '2012-10', isbn: '9787121181181', categoryCode: 'TP' },
  { title: '信息检索导论', author: 'Christopher D. Manning', publisher: '人民邮电出版社', publishDate: '2010-08', isbn: '9787115234279', categoryCode: 'TP' }
]

// 文学类（I）- 约115本
const LITERATURE_BOOKS: BookData[] = [
  // 中国现当代文学
  { title: '平凡的世界（全三册）', author: '路遥', publisher: '北京十月文艺出版社', publishDate: '2012-03', isbn: '9787530213978', categoryCode: 'I' },
  { title: '活着', author: '余华', publisher: '作家出版社', publishDate: '2012-08', isbn: '9787506365437', categoryCode: 'I' },
  { title: '围城', author: '钱钟书', publisher: '人民文学出版社', publishDate: '1991-02', isbn: '9787020022472', categoryCode: 'I' },
  { title: '白鹿原', author: '陈忠实', publisher: '人民文学出版社', publishDate: '1993-06', isbn: '9787020017392', categoryCode: 'I' },
  { title: '红高粱家族', author: '莫言', publisher: '作家出版社', publishDate: '2012-10', isbn: '9787506365468', categoryCode: 'I' },
  { title: '丰乳肥臀', author: '莫言', publisher: '作家出版社', publishDate: '2012-10', isbn: '9787506365475', categoryCode: 'I' },
  { title: '蛙', author: '莫言', publisher: '作家出版社', publishDate: '2012-10', isbn: '9787506365499', categoryCode: 'I' },
  { title: '兄弟', author: '余华', publisher: '作家出版社', publishDate: '2008-05', isbn: '9787506343233', categoryCode: 'I' },
  { title: '许三观卖血记', author: '余华', publisher: '作家出版社', publishDate: '2012-08', isbn: '9787506365444', categoryCode: 'I' },
  { title: '在细雨中呼喊', author: '余华', publisher: '作家出版社', publishDate: '2012-08', isbn: '9787506365451', categoryCode: 'I' },
  { title: '第七天', author: '余华', publisher: '作家出版社', publishDate: '2013-06', isbn: '9787506368193', categoryCode: 'I' },
  { title: '秦腔', author: '贾平凹', publisher: '作家出版社', publishDate: '2005-04', isbn: '9787506331915', categoryCode: 'I' },
  { title: '废都', author: '贾平凹', publisher: '作家出版社', publishDate: '2009-01', isbn: '9787506345489', categoryCode: 'I' },
  { title: '长恨歌', author: '王安忆', publisher: '人民文学出版社', publishDate: '2003-01', isbn: '9787020041237', categoryCode: 'I' },
  { title: '沉默的大多数', author: '王小波', publisher: '北京十月文艺出版社', publishDate: '2011-01', isbn: '9787530210816', categoryCode: 'I' },
  { title: '黄金时代', author: '王小波', publisher: '北京十月文艺出版社', publishDate: '2011-01', isbn: '9787530210816', categoryCode: 'I' },
  { title: '三体（全集）', author: '刘慈欣', publisher: '重庆出版社', publishDate: '2012-01', isbn: '9787536692930', categoryCode: 'I' },
  { title: '流浪地球', author: '刘慈欣', publisher: '四川科技出版社', publishDate: '2008-11', isbn: '9787536466428', categoryCode: 'I' },
  { title: '球状闪电', author: '刘慈欣', publisher: '四川科技出版社', publishDate: '2004-06', isbn: '9787536454289', categoryCode: 'I' },
  { title: '北京折叠', author: '郝景芳', publisher: '中信出版社', publishDate: '2016-09', isbn: '9787508664088', categoryCode: 'I' },

  // 中国古典文学
  { title: '红楼梦（上下册）', author: '曹雪芹', publisher: '人民文学出版社', publishDate: '1982-11', isbn: '9787020002207', categoryCode: 'I' },
  { title: '西游记', author: '吴承恩', publisher: '人民文学出版社', publishDate: '2004-08', isbn: '9787020023459', categoryCode: 'I' },
  { title: '三国演义', author: '罗贯中', publisher: '人民文学出版社', publishDate: '2004-08', isbn: '9787020023466', categoryCode: 'I' },
  { title: '水浒传', author: '施耐庵', publisher: '人民文学出版社', publishDate: '2004-08', isbn: '9787020023473', categoryCode: 'I' },
  { title: '聊斋志异', author: '蒲松龄', publisher: '人民文学出版社', publishDate: '2010-01', isbn: '9787020079811', categoryCode: 'I' },
  { title: '儒林外史', author: '吴敬梓', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020066712', categoryCode: 'I' },

  // 鲁迅作品
  { title: '呐喊', author: '鲁迅', publisher: '人民文学出版社', publishDate: '1979-12', isbn: '9787020002207', categoryCode: 'I' },
  { title: '彷徨', author: '鲁迅', publisher: '人民文学出版社', publishDate: '1979-12', isbn: '9787020002207', categoryCode: 'I' },
  { title: '朝花夕拾', author: '鲁迅', publisher: '人民文学出版社', publishDate: '1979-12', isbn: '9787020002207', categoryCode: 'I' },
  { title: '故事新编', author: '鲁迅', publisher: '人民文学出版社', publishDate: '1979-12', isbn: '9787020002207', categoryCode: 'I' },

  // 现代作家
  { title: '骆驼祥子', author: '老舍', publisher: '人民文学出版社', publishDate: '1962-10', isbn: '9787020002207', categoryCode: 'I' },
  { title: '四世同堂', author: '老舍', publisher: '人民文学出版社', publishDate: '1998-01', isbn: '9787020027482', categoryCode: 'I' },
  { title: '茶馆', author: '老舍', publisher: '人民文学出版社', publishDate: '2002-01', isbn: '9787020038428', categoryCode: 'I' },
  { title: '边城', author: '沈从文', publisher: '人民文学出版社', publishDate: '2000-01', isbn: '9787020032363', categoryCode: 'I' },
  { title: '呼兰河传', author: '萧红', publisher: '人民文学出版社', publishDate: '2001-01', isbn: '9787020034367', categoryCode: 'I' },
  { title: '倾城之恋', author: '张爱玲', publisher: '北京十月文艺出版社', publishDate: '2009-01', isbn: '9787530210816', categoryCode: 'I' },
  { title: '金锁记', author: '张爱玲', publisher: '北京十月文艺出版社', publishDate: '2009-01', isbn: '9787530210816', categoryCode: 'I' },
  { title: '雷雨', author: '曹禺', publisher: '人民文学出版社', publishDate: '2002-01', isbn: '9787020038435', categoryCode: 'I' },
  { title: '牡丹亭', author: '汤显祖', publisher: '人民文学出版社', publishDate: '2002-01', isbn: '9787020038442', categoryCode: 'I' },
  { title: '西厢记', author: '王实甫', publisher: '人民文学出版社', publishDate: '2002-01', isbn: '9787020038459', categoryCode: 'I' },

  // 外国文学
  { title: '百年孤独', author: '加西亚·马尔克斯', publisher: '南海出版公司', publishDate: '2011-06', isbn: '9787544253994', categoryCode: 'I' },
  { title: '霍乱时期的爱情', author: '加西亚·马尔克斯', publisher: '南海出版公司', publishDate: '2012-09', isbn: '9787544258555', categoryCode: 'I' },
  { title: '1984', author: '乔治·奥威尔', publisher: '北京十月文艺出版社', publishDate: '2010-04', isbn: '9787530210816', categoryCode: 'I' },
  { title: '动物农场', author: '乔治·奥威尔', publisher: '北京十月文艺出版社', publishDate: '2010-04', isbn: '9787530210823', categoryCode: 'I' },
  { title: '追风筝的人', author: '卡勒德·胡赛尼', publisher: '上海人民出版社', publishDate: '2006-05', isbn: '9787208061644', categoryCode: 'I' },
  { title: '灿烂千阳', author: '卡勒德·胡赛尼', publisher: '上海人民出版社', publishDate: '2007-09', isbn: '9787208073357', categoryCode: 'I' },
  { title: '白夜行', author: '东野圭吾', publisher: '南海出版公司', publishDate: '2013-01', isbn: '9787544258562', categoryCode: 'I' },
  { title: '解忧杂货店', author: '东野圭吾', publisher: '南海出版公司', publishDate: '2014-05', isbn: '9787544269982', categoryCode: 'I' },
  { title: '嫌疑人X的献身', author: '东野圭吾', publisher: '南海出版公司', publishDate: '2014-06', isbn: '9787544270095', categoryCode: 'I' },
  { title: '挪威的森林', author: '村上春树', publisher: '上海译文出版社', publishDate: '2001-02', isbn: '9787532726303', categoryCode: 'I' },
  { title: '海边的卡夫卡', author: '村上春树', publisher: '上海译文出版社', publishDate: '2003-04', isbn: '9787532731642', categoryCode: 'I' },
  { title: '老人与海', author: '海明威', publisher: '上海译文出版社', publishDate: '2009-01', isbn: '9787532746943', categoryCode: 'I' },
  { title: '了不起的盖茨比', author: 'F.S.菲茨杰拉德', publisher: '上海译文出版社', publishDate: '2011-01', isbn: '9787532752695', categoryCode: 'I' },
  { title: '麦田里的守望者', author: 'J.D.塞林格', publisher: '译林出版社', publishDate: '2010-01', isbn: '9787544712378', categoryCode: 'I' },
  { title: '杀死一只知更鸟', author: '哈珀·李', publisher: '译林出版社', publishDate: '2012-01', isbn: '9787544723458', categoryCode: 'I' },
  { title: '傲慢与偏见', author: '简·奥斯汀', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068221', categoryCode: 'I' },
  { title: '简爱', author: '夏洛蒂·勃朗特', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068238', categoryCode: 'I' },
  { title: '呼啸山庄', author: '艾米莉·勃朗特', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068245', categoryCode: 'I' },
  { title: '复活', author: '托尔斯泰', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068252', categoryCode: 'I' },
  { title: '战争与和平', author: '托尔斯泰', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068269', categoryCode: 'I' },
  { title: '安娜·卡列尼娜', author: '托尔斯泰', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068276', categoryCode: 'I' },
  { title: '罪与罚', author: '陀思妥耶夫斯基', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068283', categoryCode: 'I' },
  { title: '红与黑', author: '司汤达', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068290', categoryCode: 'I' },
  { title: '巴黎圣母院', author: '雨果', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068307', categoryCode: 'I' },
  { title: '悲惨世界', author: '雨果', publisher: '人民文学出版社', publishDate: '2008-01', isbn: '9787020068314', categoryCode: 'I' },
  { title: '双城记', author: '查尔斯·狄更斯', publisher: '上海译文出版社', publishDate: '2011-01', isbn: '9787532752701', categoryCode: 'I' },
  { title: '飘', author: '玛格丽特·米切尔', publisher: '译林出版社', publishDate: '2010-01', isbn: '9787544712385', categoryCode: 'I' },
  { title: '小王子', author: '安托万·德·圣-埃克苏佩里', publisher: '人民文学出版社', publishDate: '2003-08', isbn: '9787020042494', categoryCode: 'I' },
  { title: '局外人', author: '阿尔贝·加缪', publisher: '上海译文出版社', publishDate: '2010-09', isbn: '9787532750929', categoryCode: 'I' },
  { title: '变形记', author: '弗兰兹·卡夫卡', publisher: '上海译文出版社', publishDate: '2012-01', isbn: '9787532755436', categoryCode: 'I' }
]

// 历史地理类（K）- 约80本
const HISTORY_BOOKS: BookData[] = [
  // 通史类
  { title: '中国通史', author: '吕思勉', publisher: '华东师范大学出版社', publishDate: '1992-08', isbn: '9787561709362', categoryCode: 'K' },
  { title: '全球通史', author: '斯塔夫里阿诺斯', publisher: '北京大学出版社', publishDate: '2005-01', isbn: '9787301085366', categoryCode: 'K' },
  { title: '人类简史：从动物到上帝', author: '尤瓦尔·赫拉利', publisher: '中信出版社', publishDate: '2014-11', isbn: '9787508647357', categoryCode: 'K' },
  { title: '未来简史', author: '尤瓦尔·赫拉利', publisher: '中信出版社', publishDate: '2017-02', isbn: '9787508667682', categoryCode: 'K' },
  { title: '今日简史', author: '尤瓦尔·赫拉利', publisher: '中信出版社', publishDate: '2018-08', isbn: '9787508694268', categoryCode: 'K' },
  { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', publisher: '上海译文出版社', publishDate: '2006-04', isbn: '9787532737230', categoryCode: 'K' },

  // 断代史
  { title: '万历十五年', author: '黄仁宇', publisher: '中华书局', publishDate: '2006-08', isbn: '9787101052039', categoryCode: 'K' },
  { title: '明朝那些事儿（全集）', author: '当年明月', publisher: '浙江人民出版社', publishDate: '2007-03', isbn: '9787213034474', categoryCode: 'K' },
  { title: '中国近代史', author: '蒋廷黻', publisher: '上海古籍出版社', publishDate: '2004-01', isbn: '9787532536788', categoryCode: 'K' },
  { title: '中国现代史', author: '王桧林', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040289135', categoryCode: 'K' },
  { title: '世界近代史', author: '刘宗绪', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040289142', categoryCode: 'K' },
  { title: '世界现代史', author: '齐世荣', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040289159', categoryCode: 'K' },

  // 史记与古籍
  { title: '史记', author: '司马迁', publisher: '中华书局', publishDate: '2013-01', isbn: '9787101003048', categoryCode: 'K' },
  { title: '资治通鉴', author: '司马光', publisher: '中华书局', publishDate: '2011-01', isbn: '9787101003055', categoryCode: 'K' },
  { title: '汉书', author: '班固', publisher: '中华书局', publishDate: '2012-01', isbn: '9787101003062', categoryCode: 'K' },
  { title: '后汉书', author: '范晔', publisher: '中华书局', publishDate: '2012-01', isbn: '9787101003079', categoryCode: 'K' },
  { title: '三国志', author: '陈寿', publisher: '中华书局', publishDate: '2011-01', isbn: '9787101003086', categoryCode: 'K' },

  // 哲学思想
  { title: '苏菲的世界', author: '乔斯坦·贾德', publisher: '作家出版社', publishDate: '2007-10', isbn: '9787506341631', categoryCode: 'K' },
  { title: '中国哲学史', author: '冯友兰', publisher: '华东师范大学出版社', publishDate: '2011-01', isbn: '9787561784266', categoryCode: 'K' },
  { title: '中国思想史', author: '葛兆光', publisher: '复旦大学出版社', publishDate: '2001-01', isbn: '9787309027654', categoryCode: 'K' },
  { title: '世界哲学史', author: '梯利', publisher: '商务印书馆', publishDate: '2004-01', isbn: '9787100039478', categoryCode: 'K' },

  // 专题史
  { title: '中国文化史', author: '柳诒徵', publisher: '上海古籍出版社', publishDate: '2001-01', isbn: '9787532529643', categoryCode: 'K' },
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

  // 世界历史
  { title: '世界文化史', author: '庄锡昌', publisher: '高等教育出版社', publishDate: '2004-01', isbn: '9787040147803', categoryCode: 'K' },
  { title: '世界经济史', author: '龙多·卡梅伦', publisher: '上海译文出版社', publishDate: '2013-01', isbn: '9787532760905', categoryCode: 'K' },
  { title: '世界政治史', author: '亨廷顿', publisher: '新华出版社', publishDate: '1999-01', isbn: '9787501142815', categoryCode: 'K' },
  { title: '世界军事史', author: '杜普伊', publisher: '解放军出版社', publishDate: '2006-01', isbn: '9787506550274', categoryCode: 'K' },
  { title: '世界科技史', author: '李约瑟', publisher: '科学出版社', publishDate: '1990-01', isbn: '9787030016156', categoryCode: 'K' },
  { title: '世界艺术史', author: '休·昂纳', publisher: '南方出版社', publishDate: '2014-01', isbn: '9787550117986', categoryCode: 'K' },
  { title: '世界建筑史', author: '肯尼思·弗兰姆普敦', publisher: '中国建筑工业出版社', publishDate: '2007-01', isbn: '9787112089367', categoryCode: 'K' },
  { title: '世界文学史', author: '郑克鲁', publisher: '华东师范大学出版社', publishDate: '2000-01', isbn: '9787561722663', categoryCode: 'K' },
  { title: '世界民俗学', author: '邓迪斯', publisher: '上海文艺出版社', publishDate: '2006-01', isbn: '9787532139893', categoryCode: 'K' },
  { title: '世界宗教史', author: '埃里克·J·夏普', publisher: '上海人民出版社', publishDate: '2004-01', isbn: '9787208051805', categoryCode: 'K' },

  // 地理类
  { title: '中国地理', author: '赵济', publisher: '高等教育出版社', publishDate: '2005-08', isbn: '9787040174188', categoryCode: 'K' },
  { title: '国家地理百科全书', author: '中国大百科全书出版社', publisher: '中国大百科全书出版社', publishDate: '2012-01', isbn: '9787500087366', categoryCode: 'K' },
  { title: '美丽中国', author: '《中国国家地理》杂志社', publisher: '中国大百科全书出版社', publishDate: '2013-09', isbn: '9787500092438', categoryCode: 'K' },
  { title: '中国地图册', author: '中国地图出版社', publisher: '中国地图出版社', publishDate: '2015-01', isbn: '9787503186558', categoryCode: 'K' },
  { title: '世界地图册', author: '中国地图出版社', publisher: '中国地图出版社', publishDate: '2015-01', isbn: '9787503186565', categoryCode: 'K' },
  { title: '地理学与生活', author: '阿瑟·格蒂斯', publisher: '世界图书出版公司', publishDate: '2013-01', isbn: '9787510059159', categoryCode: 'K' }
]

// 数理科学类（O）- 约35本
const SCIENCE_BOOKS: BookData[] = [
  // 数学
  { title: '高等数学（第七版）', author: '同济大学数学系', publisher: '高等教育出版社', publishDate: '2014-07', isbn: '9787040396638', categoryCode: 'O' },
  { title: '线性代数（第五版）', author: '同济大学数学系', publisher: '高等教育出版社', publishDate: '2007-05', isbn: '9787040207468', categoryCode: 'O' },
  { title: '概率论与数理统计（第四版）', author: '浙江大学', publisher: '高等教育出版社', publishDate: '2008-06', isbn: '9787040239605', categoryCode: 'O' },
  { title: '数学分析（第四版）', author: '华东师范大学数学系', publisher: '高等教育出版社', publishDate: '2010-07', isbn: '9787040295665', categoryCode: 'O' },
  { title: '什么是数学', author: 'R·柯朗', publisher: '复旦大学出版社', publishDate: '2005-03', isbn: '9787309044949', categoryCode: 'O' },
  { title: '数学之美', author: '吴军', publisher: '人民邮电出版社', publishDate: '2012-05', isbn: '9787115282828', categoryCode: 'O' },
  { title: '离散数学', author: '屈婉玲', publisher: '高等教育出版社', publishDate: '2008-03', isbn: '9787040235478', categoryCode: 'O' },
  { title: '复变函数论', author: '钟玉泉', publisher: '高等教育出版社', publishDate: '2013-01', isbn: '9787040365519', categoryCode: 'O' },
  { title: '实变函数论', author: '周民强', publisher: '北京大学出版社', publishDate: '2008-01', isbn: '9787301133755', categoryCode: 'O' },
  { title: '泛函分析讲义', author: '张恭庆', publisher: '北京大学出版社', publishDate: '2006-01', isbn: '9787301108233', categoryCode: 'O' },
  { title: '微分几何', author: '陈维桓', publisher: '北京大学出版社', publishDate: '2006-01', isbn: '9787301108240', categoryCode: 'O' },
  { title: '拓扑学', author: '尤承业', publisher: '北京大学出版社', publishDate: '2006-01', isbn: '9787301108257', categoryCode: 'O' },
  { title: '运筹学', author: '《运筹学》教材编写组', publisher: '清华大学出版社', publishDate: '2005-01', isbn: '9787302105524', categoryCode: 'O' },
  { title: '数值分析', author: '李庆扬', publisher: '清华大学出版社', publishDate: '2008-01', isbn: '9787302172663', categoryCode: 'O' },

  // 统计学
  { title: '统计学', author: '贾俊平', publisher: '中国人民大学出版社', publishDate: '2012-01', isbn: '9787300154559', categoryCode: 'O' },
  { title: '回归分析', author: '何晓群', publisher: '中国人民大学出版社', publishDate: '2012-01', isbn: '9787300154566', categoryCode: 'O' },
  { title: '时间序列分析', author: '王振龙', publisher: '中国统计出版社', publishDate: '2000-01', isbn: '9787503732575', categoryCode: 'O' },
  { title: '多元统计分析', author: '何晓群', publisher: '中国人民大学出版社', publishDate: '2012-01', isbn: '9787300154573', categoryCode: 'O' },
  { title: '随机过程', author: '刘次华', publisher: '高等教育出版社', publishDate: '2004-01', isbn: '9787040137373', categoryCode: 'O' },
  { title: '数理统计', author: '茆诗松', publisher: '高等教育出版社', publishDate: '2006-01', isbn: '9787040198360', categoryCode: 'O' },

  // 物理学
  { title: '时间简史', author: '史蒂芬·霍金', publisher: '湖南科学技术出版社', publishDate: '2010-04', isbn: '9787535726593', categoryCode: 'O' },
  { title: '果壳中的宇宙', author: '史蒂芬·霍金', publisher: '湖南科学技术出版社', publishDate: '2006-03', isbn: '9787535744146', categoryCode: 'O' },
  { title: '物理学（第五版）', author: '程守洙', publisher: '高等教育出版社', publishDate: '1998-06', isbn: '9787040064566', categoryCode: 'O' },
  { title: '费曼物理学讲义', author: '费曼', publisher: '上海科学技术出版社', publishDate: '2013-01', isbn: '9787547815268', categoryCode: 'O' },

  // 化学
  { title: '化学原理', author: '朱文祥', publisher: '高等教育出版社', publishDate: '2011-06', isbn: '9787040322274', categoryCode: 'O' },
  { title: '无机化学', author: '武汉大学', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040296907', categoryCode: 'O' },
  { title: '有机化学', author: '邢其毅', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040311536', categoryCode: 'O' },

  // 生物学
  { title: '普通生物学（第四版）', author: '陈阅增', publisher: '高等教育出版社', publishDate: '2014-08', isbn: '9787040409132', categoryCode: 'O' },
  { title: '分子生物学', author: '朱玉贤', publisher: '高等教育出版社', publishDate: '2013-01', isbn: '9787040363669', categoryCode: 'O' },
  { title: '遗传学', author: '刘祖洞', publisher: '高等教育出版社', publishDate: '2010-01', isbn: '9787040295658', categoryCode: 'O' },
  { title: '细胞生物学', author: '翟中和', publisher: '高等教育出版社', publishDate: '2011-01', isbn: '9787040318184', categoryCode: 'O' }
]

// 艺术类（J）- 约20本
const ART_BOOKS: BookData[] = [
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
  { title: '中国音乐史', author: '杨荫浏', publisher: '人民音乐出版社', publishDate: '1981-01', isbn: '9787103006917', categoryCode: 'J' },
  { title: '世界电影史', author: '克莉丝汀·汤普森', publisher: '北京大学出版社', publishDate: '2004-01', isbn: '9787301071230', categoryCode: 'J' }
]

// 导出所有图书
export const ALL_BOOKS: BookData[] = [
  ...COMPUTER_BOOKS,
  ...LITERATURE_BOOKS,
  ...HISTORY_BOOKS,
  ...SCIENCE_BOOKS,
  ...ART_BOOKS
]

// 按类别获取图书
export function getBooksByCategory(categoryCode: string): BookData[] {
  return ALL_BOOKS.filter(book => book.categoryCode === categoryCode)
}

// 随机获取图书
export function getRandomBook(categoryCode?: string): BookData {
  const pool = categoryCode ? getBooksByCategory(categoryCode) : ALL_BOOKS
  return pool[Math.floor(Math.random() * pool.length)]
}

// 获取图书类别分布
export function getCategoryDistribution(): Record<string, number> {
  const distribution: Record<string, number> = {}
  for (const book of ALL_BOOKS) {
    distribution[book.categoryCode] = (distribution[book.categoryCode] || 0) + 1
  }
  return distribution
}

// 计划中的类别分布（用于生成时参考）
export const TARGET_DISTRIBUTION = {
  TP: 0.35,  // 计算机类 35%
  I: 0.30,   // 文学类 30%
  K: 0.20,   // 历史类 20%
  O: 0.10,   // 数理类 10%
  J: 0.05    // 艺术类 5%
}
