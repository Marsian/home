export type ResumeContent = {
  name: string
  title: string
  location?: string
  email: string
  phone?: string
  links?: Array<{ label: string; url: string }>
  summary: string
  skills: string[]
  experiences: Array<{
    company: string
    role: string
    period: string
    bullets: string[]
  }>
  education?: Array<{
    school: string
    degree?: string
    period: string
    bullets?: string[]
  }>
}

// TODO: 把这里替换成你的真实简历内容
export const resumeContent: ResumeContent = {
  name: '你的姓名',
  title: '前端/全栈工程师',
  location: '城市 · 可远程',
  email: 'your.email@example.com',
  phone: '+86 1xxxxxxxxxx',
  links: [
    { label: 'GitHub', url: 'https://github.com/your-username' },
    { label: '个人主页', url: 'https://your-site.example.com' }
  ],
  summary:
    '专注于 React 生态与工程化实践，具备从需求拆解、架构设计到交付迭代的经验。擅长性能优化、可维护性与可观测性建设。',
  skills: [
    'React / TypeScript',
    '性能优化（渲染/打包/监控）',
    '工程化（CI/CD、脚手架、规范化）',
    'Node.js / 后端协作'
  ],
  experiences: [
    {
      company: '公司名称',
      role: '职位名称',
      period: '2023.01 - 至今',
      bullets: [
        '负责核心业务前端重构，提升页面可维护性与交付效率。',
        '主导性能优化工作，核心页面首屏指标改善。',
        '完善埋点与可观测性体系，推动问题闭环处理。'
      ]
    },
    {
      company: '上一家公司',
      role: '职位名称',
      period: '2020.07 - 2022.12',
      bullets: ['参与产品迭代与组件库建设，提升一致性与复用率。']
    }
  ],
  education: [
    {
      school: '学校名称',
      degree: '学士/硕士',
      period: '2016.09 - 2020.06',
      bullets: ['可选：研究方向/课程亮点等']
    }
  ]
}

