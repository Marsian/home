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

export type ResumeBlock =
  | ResumeHeaderBlock
  | ResumeExperienceBlock
  | ResumeEducationBlock
  | ResumeSkillsBlock

export const resumeContents: ResumeBlock[] = [
  {
    type: 'header',
    data: {
      name: '王岩溪',
      contacts: [
        { label: '电话', value: '18501640042' },
        { label: '邮箱', value: 'yanxiwang91@163.com' },
        {
          label: '网站',
          value: 'https://marswang.com',
          href: 'https://marswang.com',
          display: 'marswang.com'
        },
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
        '前端框架：AngularJS；具备组件化与复杂表单/权限/路由等业务开发经验',
        '工程与工具：NodeJS，Git / SVN；熟悉模块化、构建与前端工程协作流程',
        '后端与接口：ASP.NET（C#）/ RESTful；理解接口设计与联调、可扩展服务开发',
        '云与数据：AWS（S3、DynamoDB、SQS），DynamoDB / MySQL / MongoDB',
        '跨端与兼容：跨浏览器、跨终端 Web 应用开发与适配经验'
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
          company: 'Compulink Management Center, Inc. (Laserfiche)',
          role: '软件工程师 II · Web Access 开发组',
          period: '2015.04 - 2017.06',
          bullets: [
            '负责 Laserfiche Web Admin 移植及云部署，基于 AngularJS 和 .NET 4.5 移植全部功能，实现跨终端网页界面。',
            '将本地用户数据迁移至 DynamoDB，并随产品部署于 AWS 云集群。',
            '参与 Laserfiche Audit Trail 重构及云部署，使用 AngularJS 与 .NET 4.5 RESTful 服务重构前后端。',
            '利用 AWS S3、DynamoDB 及 SQS 实现用户数据存储与服务通信，并支持产品实例按需部署与负载均衡。',
            '参与 Laserfiche Web Access 开发，以 AngularJS 为核心架构构建跨浏览器、跨终端网页应用，并研发基于 .NET 的可扩展 RESTful 网络服务。'
          ]
        },
        {
          company: 'Arista Networks, Inc.',
          role: '实习软件工程师 · BGP 开发组',
          period: '2014.06 - 2014.09',
          bullets: [
            '将 Ixia 设备引入测试系统，实现 SDN 多设备大规模广度测试。',
            '改进测试架构，支持多设备网络测试环境。'
          ]
        }
      ]
    }
  }
]

