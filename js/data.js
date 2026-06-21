/* 7 分类数据配置 - 每类下展示 3 款游戏 */
const CATEGORIES = [
  {
    id: 'memory',
    name: '记忆',
    nameZh: '记忆',
    description: '训练工作记忆、空间记忆和短期记忆',
    color: '#7C3AED',
    lightColor: '#F3E8FF',
    icon: '🧠',
    status: 'active',
    gameCount: 3,
    games: [
      {
        id: 'memory_matrix',
        name: '记忆矩阵',
        nameZh: '记忆矩阵',
        description: '记忆闪烁方块的位置，测试空间工作记忆',
        status: 'active',
        paradigm: '空间工作记忆',
        emoji: '🔲',
        coverColor: '#7C3AED'
      },
      {
        id: 'memory_match',
        name: '符号配对',
        nameZh: '符号配对',
        description: '判断符号是否在序列中出现过，经典工作记忆训练',
        status: 'active',
        paradigm: '工作记忆保持',
        emoji: '🃏',
        coverColor: '#A78BFA'
      },
      {
        id: 'tidal_treasures',
        name: '海洋宝藏',
        nameZh: '海洋宝藏',
        description: '从潮池中选择独特的海洋宝藏',
        status: 'coming_soon',
        paradigm: '识别与回忆',
        emoji: '🐚',
        coverColor: '#A78BFA'
      }
    ]
  },
  {
    id: 'speed',
    name: '处理速度',
    nameZh: '处理速度',
    description: '提升信息处理速度、快速比较与反应能力',
    color: '#F59E0B',
    lightColor: '#FEF3C7',
    icon: '⚡',
    status: 'active',
    gameCount: 3,
    games: [
      {
        id: 'speed_match',
        name: '符号速配',
        nameZh: '符号速配',
        description: '快速判断当前符号与前一个是否相同，测试信息处理速度',
        status: 'active',
        paradigm: '信息处理速度',
        emoji: '⚡',
        coverColor: '#F59E0B'
      },
      {
        id: 'highway_hazards',
        name: '道路障碍',
        nameZh: '道路障碍',
        description: '快速躲避道路障碍，测试反应速度',
        status: 'coming_soon',
        paradigm: '反应速度',
        emoji: '🚗',
        coverColor: '#FBBF24'
      },
      {
        id: 'splitting_seeds',
        name: '分割种子',
        nameZh: '分割种子',
        description: '快速将种子均分成两堆，训练数量感',
        status: 'coming_soon',
        paradigm: '数量感',
        emoji: '🐦',
        coverColor: '#FBBF24'
      }
    ]
  },
  {
    id: 'attention',
    name: '注意力',
    nameZh: '注意力',
    description: '锻炼选择性注意和分配性注意力',
    color: '#3B82F6',
    lightColor: '#DBEAFE',
    icon: '👁️',
    status: 'active',
    gameCount: 3,
    games: [
      {
        id: 'flanker_bird',
        name: '飞鸟注意力',
        nameZh: '飞鸟注意力',
        description: '忽略干扰鸟，判断目标鸟的朝向，经典侧抑制任务',
        status: 'active',
        paradigm: '侧抑制任务',
        emoji: '🐦',
        coverColor: '#3B82F6'
      },
      {
        id: 'trouble_brewing',
        name: '咖啡师',
        nameZh: '咖啡师',
        description: '同时处理多个咖啡订单，训练分配性注意力',
        status: 'coming_soon',
        paradigm: '分配性注意力',
        emoji: '☕',
        coverColor: '#60A5FA'
      },
      {
        id: 'lost_in_migration',
        name: '迷失迁徙',
        nameZh: '迷失迁徙',
        description: '判断领头鸟的方向，忽略鸟群中的干扰',
        status: 'coming_soon',
        paradigm: '选择性注意',
        emoji: '🐦',
        coverColor: '#60A5FA'
      }
    ]
  },
  {
    id: 'flexibility',
    name: '灵活性',
    nameZh: '灵活性',
    description: '训练任务切换和认知灵活性',
    color: '#10B981',
    lightColor: '#D1FAE5',
    icon: '🔄',
    status: 'active',
    gameCount: 3,
    games: [
      {
        id: 'color_shape',
        name: '颜色形状',
        nameZh: '颜色形状',
        description: '根据切换的规则判断颜色或形状匹配，经典任务切换范式',
        status: 'active',
        paradigm: '任务切换',
        emoji: '🔷',
        coverColor: '#10B981'
      },
      {
        id: 'task_switch',
        name: '规则切换',
        nameZh: '规则切换',
        description: '在不同判断规则间快速切换',
        status: 'coming_soon',
        paradigm: '规则切换',
        emoji: '🔄',
        coverColor: '#34D399'
      },
      {
        id: 'rule_breaker',
        name: '规则打破',
        nameZh: '规则打破',
        description: '打破常规思维，寻找新解法',
        status: 'coming_soon',
        paradigm: '创新思维',
        emoji: '💡',
        coverColor: '#34D399'
      }
    ]
  },
  {
    id: 'problem-solving',
    name: '问题解决',
    nameZh: '问题解决',
    description: '提升逻辑推理和策略规划能力',
    color: '#EF4444',
    lightColor: '#FEE2E2',
    icon: '🧩',
    status: 'coming_soon',
    gameCount: 3,
    games: [
      {
        id: 'train_of_thought',
        name: '思维列车',
        nameZh: '思维列车',
        description: '规划路线，训练序列推理',
        status: 'coming_soon',
        paradigm: '序列推理',
        emoji: '🚂',
        coverColor: '#EF4444'
      },
      {
        id: 'pet_detective',
        name: '宠物侦探',
        nameZh: '宠物侦探',
        description: '通过线索推理找到正确宠物',
        status: 'coming_soon',
        paradigm: '逻辑推理',
        emoji: '🐕',
        coverColor: '#F87171'
      },
      {
        id: 'organize_express',
        name: '整理快递',
        nameZh: '整理快递',
        description: '合理规划空间，优化排列',
        status: 'coming_soon',
        paradigm: '空间规划',
        emoji: '📦',
        coverColor: '#F87171'
      }
    ]
  },
  {
    id: 'word',
    name: '语言',
    nameZh: '语言',
    description: '增强词汇量和语言流畅性',
    color: '#06B6D4',
    lightColor: '#CFFAFE',
    icon: '📝',
    status: 'coming_soon',
    gameCount: 3,
    games: [
      {
        id: 'word_scramble',
        name: '词汇拼写',
        nameZh: '词汇拼写',
        description: '重新排列字母组成正确词汇',
        status: 'coming_soon',
        paradigm: '词汇拼写',
        emoji: '🔤',
        coverColor: '#06B6D4'
      },
      {
        id: 'word_bubbles',
        name: '词汇泡泡',
        nameZh: '词汇泡泡',
        description: '根据前缀快速想出词汇',
        status: 'coming_soon',
        paradigm: '词汇流畅性',
        emoji: '💬',
        coverColor: '#22D3EE'
      },
      {
        id: 'reading_comp',
        name: '阅读理解',
        nameZh: '阅读理解',
        description: '快速理解并判断文本含义',
        status: 'coming_soon',
        paradigm: '阅读理解',
        emoji: '📖',
        coverColor: '#22D3EE'
      }
    ]
  },
  {
    id: 'math',
    name: '数学',
    nameZh: '数学',
    description: '提高数量计算和数学推理',
    color: '#EC4899',
    lightColor: '#FCE7F3',
    icon: '🔢',
    status: 'coming_soon',
    gameCount: 3,
    games: [
      {
        id: 'rapid_math',
        name: '快速计算',
        nameZh: '快速计算',
        description: '快速完成基础数学运算',
        status: 'coming_soon',
        paradigm: '算术速度',
        emoji: '➕',
        coverColor: '#EC4899'
      },
      {
        id: 'number_line',
        name: '数轴估算',
        nameZh: '数轴估算',
        description: '在数轴上估算数字位置',
        status: 'coming_soon',
        paradigm: '数量估算',
        emoji: '📏',
        coverColor: '#F472B6'
      },
      {
        id: 'ratio',
        name: '比例推理',
        nameZh: '比例推理',
        description: '判断两组数量的比例关系',
        status: 'coming_soon',
        paradigm: '比例推理',
        emoji: '⚖️',
        coverColor: '#F472B6'
      }
    ]
  }
];

/* 辅助函数 */
function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id);
}

function getActiveCategories() {
  return CATEGORIES.filter(c => c.status === 'active');
}

function getAllCategories() {
  return CATEGORIES;
}
