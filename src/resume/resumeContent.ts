export type ResumeHeaderBlock = {
  type: 'header'
  title?: string
  data: {
    name: string
    contacts: Array<{
      label: string
      value: string
      href?: string
      display?: string
    }>
  }
}

export type ResumeExperienceBlock = {
  type: 'experience'
  title: string
  data: {
    items: Array<{
      company: string
      role: string
      period: string
      bullets: string[]
    }>
  }
}

export type ResumeEducationBlock = {
  type: 'education'
  title: string
  data: {
    items: Array<{
      school: string
      degree?: string
      period: string
      bullets?: string[]
    }>
  }
}

export type ResumeSkillsBlock = {
  type: 'skills'
  title: string
  data: {
    items: string[]
  }
}

export type ResumeLicensesBlock = {
  type: 'licenses'
  title: string
  data: {
    items: string[]
  }
}

export type ResumeBlock =
  | ResumeHeaderBlock
  | ResumeExperienceBlock
  | ResumeEducationBlock
  | ResumeSkillsBlock
  | ResumeLicensesBlock

export const resumeContents: ResumeBlock[] = [
  {
    type: 'header',
    data: {
      name: '王岩溪',
      contacts: [
        { label: '电话', value: '18501640042' },
        { label: '邮箱', value: 'yanxiwang91@163.com' },
        { label: '地点', value: '上海' }
      ]
    }
  },
  {
    type: 'skills',
    title: '个人技能',
    data: {
      items: [
        '核心栈：JavaScript / TypeScript，HTML5，CSS3 / Sass',
        'AI Coding：Cursor，Claude Code，OpenCode；熟练使用AI工具进行全流程开发',
        '前端框架：React，Angular，Vue；具备大型前端项目从0到100的开发与维护经验',
        '研发管理：~20人团队管理经验，从零开始组建团队，并带领团队完成多个大型项目',
      ]
    }
  },
  {
    type: 'education',
    title: '教育背景',
    data: {
      items: [
        {
          school: '加州大学洛杉矶分校 (UCLA)',
          degree: '硕士 · 电子工程',
          period: '2013.09 - 2015.03'
        },
        {
          school: '上海交通大学 (SJTU)',
          degree: '本科 · 信息工程',
          period: '2009.09 - 2013.06'
        }
      ]
    }
  },
  {
    type: 'experience',
    title: '工作经历',
    data: {
      items: [
        {
          company: '星环信息科技（上海）股份有限公司',
          role: '前端负责人 · 数据平台部门',
          period: '2017.07 至今',
          bullets: [
            '负责前端部门的技术管理和人事管理，负责数据平台部门所有产品线的前端工作的落地与改进，主要项目包括：',
            'Astro - AI驱动的智能数据分析平台，提供多种领域相关智能体，提供自然语言交互、智能分析、数据洞察等能力。支持生成式UI、Human In Loop、数据可视化、在线Excel等能力。',
            'Transwarp Data Studio - 大数据开发与治理一站式平台，包含大数据开发、治理、运营等10余个核心功能模块。提供多样化数据相关工具，支撑全流程的可视化数据开发、监控、运维和告警。',
            'Transwarp Data Cloud - 数据云平台，基于容器、分布式、微服务等云原生技术，在一个统一的云平台上提供 DB PaaS、Analytics PaaS、Application PaaS 等服务。',
          ]
        },
        {
          company: 'Compulink Management Center, Inc. (Laserfiche)',
          role: '软件工程师 II · Web Access 开发组',
          period: '2015.04 - 2017.06',
          bullets: [
            '参与 Laserfiche Web Access 开发，以 AngularJS 为核心架构构建跨浏览器、跨终端网页应用，并研发基于 .NET 的可扩展 RESTful 网络服务。',
            '负责产品部署迁移至 AWS 云集群，利用 AWS S3、DynamoDB 及 SQS 实现用户数据存储与服务通信，并支持产品实例按需部署与负载均衡。',
          ]
        }
      ]
    }
  },
  {
    type: 'licenses',
    title: '资质证书',
    data: {
      items: [
        '计算机高级专业技术资格证书·系统架构设计师'
      ]
    }
  }
]

