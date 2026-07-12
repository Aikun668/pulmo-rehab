/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  HelpCircle,
  User,
  Activity,
  Brain,
  Shield,
  TrendingUp,
  FileText,
  Users,
  Building2,
  RefreshCw,
  ArrowRight,
  Mail,
} from "lucide-react";

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

// ============================================================================
// 配置数据
// ============================================================================

const NAV_ITEMS = [
  { label: "产品功能", href: "#features" },
  { label: "解决方案", href: "#solutions" },
  { label: "临床优势", href: "#advantages" },
  { label: "合作联系", href: "#contact" },
] as const;

const FEATURES = [
  {
    icon: Activity,
    title: "智能康复评估",
    desc: "呼吸困难 + 疲劳度双维度评分，结合恢复阶段与风险因素，自动判定五级康复等级",
  },
  {
    icon: Brain,
    title: "AI 处方生成",
    desc: "基于 7 天血氧/心率/疲劳趋势数据，DeepSeek 深度分析，生成个性化训练方案",
  },
  {
    icon: Shield,
    title: "安全预警",
    desc: "血氧 < 92%、心率 > 120、疲劳 > 8、呼吸困难 ≥ 4，四项指标实时触发预警",
  },
  {
    icon: TrendingUp,
    title: "训练可视化",
    desc: "30 天训练完成率趋势折线图，日均线对比，医生一眼掌握患者依从趋势",
  },
  {
    icon: FileText,
    title: "AI 康复小结",
    desc: "医生输入关键判断 + 患者全量训练与评估数据 → AI 融合生成结构化小结",
  },
];

const SOLUTIONS = [
  {
    icon: Users,
    title: "门诊随访管理",
    desc: "出院后居家康复的远程监控与定时随访，系统自动识别需关注患者，降低失访率",
  },
  {
    icon: Building2,
    title: "多中心科研协同",
    desc: "支持多中心临床研究数据统一采集与管理，国自然重大专项（COPD 随访研究 B3 组）技术支撑",
  },
  {
    icon: RefreshCw,
    title: "康复质量改进",
    desc: "评估 → 处方 → 训练 → 监测 → 调整，全链路数据闭环，持续优化康复效果",
  },
];

const ADVANTAGES = [
  {
    icon: Shield,
    title: "安全红线优先",
    desc: "SpO₂ < 92% 或 HR > 120 自动降级为 Level 1，从分级源头杜绝训练风险",
  },
  {
    icon: TrendingUp,
    title: "趋势感知处方",
    desc: "不只看单次评估值，综合分析 7 天变化趋势，处方随病情动态调整",
  },
  {
    icon: Brain,
    title: "循证分级模型",
    desc: "综合评分：呼吸困难权重 0.6 + 疲劳权重 0.4，结合恢复阶段与风险因素加权",
  },
  {
    icon: RefreshCw,
    title: "全链路闭环",
    desc: "评估 → AI 处方 → 医生审批 → 患者训练 → 预警监测 → 再评估，完整闭环管理",
  },
];

// ============================================================================
// 子组件
// ============================================================================

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-14 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-[#1a1a2e]">
        {children}
      </h2>
      <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#2F5D7C]" />
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export default function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // --- 导航栏背景切换 ---
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // --- IntersectionObserver：当前可见 section 高亮导航 ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );

    const refs = sectionRefs.current;
    refs.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const setSectionRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      sectionRefs.current.set(id, el);
    }
  }, []);

  // --- 平滑滚动 ---
  const scrollToSection = (id: string) => {
    const el = sectionRefs.current.get(id);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  // ==========================================================================
  // 渲染
  // ==========================================================================

  return (
    <div className="relative w-screen">
      {/* ====================================================================
          顶部导航栏 (sticky)
          ==================================================================== */}
      <nav
        className={`sticky top-0 z-30 flex w-full items-center justify-between border-b px-10 py-4 transition-colors ${
          isScrolled
            ? "border-[#E7EDF3] bg-white/95 backdrop-blur"
            : "border-[#E7EDF3] bg-gradient-to-b from-white via-white/90 to-transparent"
        }`}
      >
        {/* 左侧 Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/src/assets/images/logo.png"
            alt="Logo"
            className="h-12 w-12 rounded object-contain"
          />
          <span className="text-lg font-bold text-[#1a1a2e]">
            肺康云康复管理平台
          </span>
        </div>

        {/* 中间导航菜单 */}
        <div className="flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const sectionId = item.href.slice(1);
            const isActive = activeSection === sectionId;

            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(sectionId);
                }}
                className={`text-base font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "text-[#2F5D7C]"
                    : "text-[#374151] hover:text-[#2F5D7C]"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {/* 右侧登录按钮 */}
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="inline-flex items-center gap-2 rounded-full border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#1a1a2e] shadow-sm hover:bg-[#F4F7FA] transition-colors cursor-pointer"
        >
          <User className="h-4 w-4 text-[#5B6B7A]" />
          医生登录
        </button>
      </nav>

      {/* ====================================================================
          Hero 区 (全屏)
          ==================================================================== */}
      <section className="relative h-screen">
        {/* 全屏背景图 */}
        <img
          src="/src/assets/images/login_bg.png"
          alt="肺康复临床协作图景"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "right center" }}
          referrerPolicy="no-referrer"
        />

        {/* 左侧 55% 渐变遮罩 + 文案 */}
        <div
          className="absolute inset-y-0 left-0 z-10"
          style={{ width: "55%" }}
        >
          <div
            className="h-full w-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,1) 50%, rgba(255,255,255,0) 100%)",
            }}
          />

          <div
            className="absolute inset-0 flex flex-col justify-center"
            style={{ paddingLeft: "calc(10% + 2.5cm)" }}
          >
            <div style={{ transform: "translateY(-3.75cm)" }}>
              <h1 className="max-w-[640px] text-[60px] font-bold leading-tight tracking-tight text-[#1a1a2e]">
                像最优秀的临床团队一样，选择肺康云
              </h1>

              <p className="mt-5 max-w-[560px] text-[22px] leading-relaxed text-[#5B6B7A]">
                简化工作流程，精准随访，赋能您的肺康复实践
              </p>

              <div className="mt-10 flex items-center gap-4">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D1D5DB] bg-white px-8 py-3 text-base font-semibold text-[#1a1a2e] shadow-sm transition-colors hover:border-[#1B3A4F] hover:bg-[#1B3A4F] hover:text-white cursor-pointer"
                >
                  快速体验
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("contact")}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D1D5DB] bg-white px-8 py-3 text-base font-semibold text-[#1a1a2e] shadow-sm transition-colors hover:border-[#1B3A4F] hover:bg-[#1B3A4F] hover:text-white cursor-pointer"
                >
                  加入我们
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <a
                  href="#advantages"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("advantages");
                  }}
                  className="inline-flex items-center gap-1 text-base font-medium text-[#2F5D7C] hover:text-[#1F3E54] transition-colors cursor-pointer"
                >
                  发现核心算法优势
                  <span className="text-lg leading-none">&rarr;</span>
                </a>

                <a
                  href="#features"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("features");
                  }}
                  className="inline-flex items-center gap-1 text-base font-medium text-[#2F5D7C] hover:text-[#1F3E54] transition-colors cursor-pointer"
                >
                  使用指南
                  <span className="text-lg leading-none">&rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 右下角悬浮帮助按钮 */}
        <div className="absolute bottom-8 right-8 z-20">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-medium text-[#374151] shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:bg-[#F4F7FA] transition-colors cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-[#5B6B7A]" />
            帮助
          </button>
        </div>
      </section>

      {/* ====================================================================
          产品功能
          ==================================================================== */}
      <section
        id="features"
        ref={(el) => setSectionRef("features", el)}
        className="bg-white px-10 py-24"
      >
        <div className="mx-auto max-w-[1200px]">
          <SectionHeading>产品功能</SectionHeading>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <React.Fragment key={f.title}><Card>
                <div className="mb-4 inline-flex rounded-lg bg-[#F0F4F8] p-3">
                  <f.icon className="h-6 w-6 text-[#2F5D7C]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[#1a1a2e]">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#5B6B7A]">
                  {f.desc}
                </p>
              </Card></React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          解决方案
          ==================================================================== */}
      <section
        id="solutions"
        ref={(el) => setSectionRef("solutions", el)}
        className="bg-[#F8FAFB] px-10 py-24"
      >
        <div className="mx-auto max-w-[1200px]">
          <SectionHeading>解决方案</SectionHeading>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <React.Fragment key={s.title}><Card className="text-center">
                <div className="mb-4 inline-flex rounded-full bg-[#F0F4F8] p-4">
                  <s.icon className="h-7 w-7 text-[#2F5D7C]" />
                </div>
                <h3 className="mb-3 text-lg font-semibold text-[#1a1a2e]">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#5B6B7A]">
                  {s.desc}
                </p>
              </Card></React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          临床优势
          ==================================================================== */}
      <section
        id="advantages"
        ref={(el) => setSectionRef("advantages", el)}
        className="bg-white px-10 py-24"
      >
        <div className="mx-auto max-w-[1200px]">
          <SectionHeading>临床优势</SectionHeading>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {ADVANTAGES.map((a) => (
              <div key={a.title} className="flex gap-5">
                <div className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F0F4F8]">
                  <a.icon className="h-6 w-6 text-[#2F5D7C]" />
                </div>
                <div>
                  <h3 className="mb-1.5 text-lg font-semibold text-[#1a1a2e]">
                    {a.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#5B6B7A]">
                    {a.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          合作联系
          ==================================================================== */}
      <section
        id="contact"
        ref={(el) => setSectionRef("contact", el)}
        className="bg-[#F8FAFB] px-10 py-24"
      >
        <div className="mx-auto max-w-[720px] text-center">
          <SectionHeading>合作联系</SectionHeading>

          <p className="mb-10 text-base leading-relaxed text-[#5B6B7A]">
            基于国自然重大专项（COPD 随访研究 B3
            组）临床研究成果，专注重症肺炎恢复期肺康复管理。
            我们欢迎各级医疗机构、临床研究团队与我们联系，共同推进肺康复数字化。
          </p>

          <div className="mb-10 inline-flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-8 py-5 shadow-sm">
            <Mail className="h-5 w-5 text-[#2F5D7C]" />
            <span className="text-base text-[#374151]">
              contact@pulmo-rehab.com
            </span>
          </div>

          <div>
            <button
              type="button"
              onClick={() => scrollToSection("contact")}
              className="inline-flex items-center gap-2 rounded-full border border-[#D1D5DB] bg-white px-10 py-3.5 text-base font-semibold text-[#1a1a2e] shadow-sm transition-colors hover:border-[#1B3A4F] hover:bg-[#1B3A4F] hover:text-white cursor-pointer"
            >
              加入我们
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          Footer
          ==================================================================== */}
      <footer className="border-t border-[#E7EDF3] bg-white px-10 py-8">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/src/assets/images/logo.png"
              alt="Logo"
              className="h-8 w-8 rounded object-contain"
            />
            <span className="text-sm font-semibold text-[#1a1a2e]">
              肺康云康复管理平台
            </span>
          </div>
          <p className="text-sm text-[#9CA3AF]">
            &copy; {new Date().getFullYear()} 肺康云. 保留所有权利.
          </p>
        </div>
      </footer>
    </div>
  );
}