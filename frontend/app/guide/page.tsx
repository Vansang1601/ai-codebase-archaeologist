"use client";

import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import Icon, { type IconName } from "../components/Icon";

type Item = { icon: IconName; title: string; body: string };
type Copy = {
  intro: string;
  stepsTitle: string;
  steps: [string, string][];
  action: string;
  beforeTitle: string;
  before: [string, string][];
  areasTitle: string;
  areasLead: string;
  areas: Item[];
  inspectorTitle: string;
  inspectorLead: string;
  inspectorModes: { title: string; desc: string }[];
  apiGuideTitle: string;
  apiGuideLead: string;
  apiSteps: { step: string; title: string; desc: string }[];
  askTitle: string;
  askLead: string;
  askTips: string[];
  promptsLabel: string;
  prompts: string[];
  readTitle: string;
  read: [string, string][];
  faqTitle: string;
  faq: [string, string][];
  support: string;
};

const content: Record<"en" | "vi", Copy> = {
  en: {
    intro: "A practical handbook for repository analysis, evidence verification, and disciplined code inspection.",
    stepsTitle: "4-step analysis flow",
    steps: [
      ["Step 1 — Add a repository", "Paste a public GitHub repository URL and create an analysis job from the browser."],
      ["Step 2 — Parse and index", "The worker clones safely, records the commit SHA, extracts symbols, and builds searchable evidence."],
      ["Step 3 — Inspect and navigate", "Ask focused questions, review technical signals, and jump to cited files and line ranges."],
      ["Step 4 — Review conclusions", "Open the cited code, verify the context, and decide the next engineering action."],
    ],
    action: "Analyze a repository",
    beforeTitle: "Before you start",
    before: [
      ["Repository access", "Use a valid public GitHub repository URL."],
      ["Sign-in", "Recommended if you want your repository to remain in your workspace."],
      ["Scope", "Python is analyzed most deeply. Other languages are indexed at a lighter level."],
      ["Safety", "The platform analyzes code as data and evidence. It is not designed to execute user code during normal inspection."],
    ],
    areasTitle: "Main analysis areas",
    areasLead: "Each area helps you inspect the same repository snapshot from a different perspective.",
    areas: [
      { icon: "overview", title: "Overview", body: "Repository summary, indexed files, symbols, and analysis status." },
      { icon: "file", title: "Source explorer", body: "Browse files, inspect line numbers, and open exact evidence ranges." },
      { icon: "sparkles", title: "AI inspection", body: "Ask focused questions and receive answers tied back to the indexed code." },
      { icon: "clock", title: "History", body: "Review commit context and trace repository evolution over time." },
      { icon: "graph", title: "Dependencies", body: "Inspect structural links between files and likely impact zones." },
      { icon: "audit", title: "Technical debt", body: "Surface large files, coupling pressure, and maintainability concerns." },
      { icon: "branch", title: "Pull Requests", body: "Connect repository changes with pull request discussion and review context." },
    ],
    inspectorTitle: "Core analysis model",
    inspectorLead: "This section explains what makes Archaeologist a repository inspection tool rather than a general-purpose chatbot.",
    inspectorModes: [
      { title: "Repository structure", desc: "Maps the layout of the codebase, the main modules, and responsibility boundaries." },
      { title: "Evidence-backed inspection", desc: "Answers are tied to indexed files, symbols, and cited line ranges whenever enough evidence exists." },
      { title: "Change impact review", desc: "Helps estimate which modules and files may be affected before you modify code." },
      { title: "Technical quality signals", desc: "Highlights maintainability risks such as large files, tight coupling, and dense change hotspots." },
    ],
    apiGuideTitle: "Validation and reliability",
    apiGuideLead: "Useful results come from repeated testing across many repositories and careful review of the retrieved evidence.",
    apiSteps: [
      { step: "01", title: "Test across many codebases", desc: "Use repositories with different sizes and structures so you can judge how stable the inspection quality is." },
      { step: "02", title: "Ask multiple focused questions", desc: "Do not rely on one prompt. Compare several focused questions to see whether the same conclusion remains consistent." },
      { step: "03", title: "Verify cited code", desc: "Always inspect the cited file path and line ranges before accepting the conclusion as correct." },
      { step: "04", title: "Keep a human review step", desc: "The system supports investigation, but final engineering decisions should still be confirmed by a reviewer or developer." },
    ],
    askTitle: "How to ask effective questions",
    askLead: "Specific questions produce clearer evidence and more actionable results.",
    askTips: [
      "Name the file, function, or class you want to inspect.",
      "Ask one concern at a time: security, impact, ownership, or technical debt.",
      "Use cited lines as your primary verification source.",
    ],
    promptsLabel: "Example questions",
    prompts: [
      "Where is the HTTP request lifecycle handled?",
      "Which modules are responsible for authentication?",
      "Which files could be affected if the repository service layer changes?",
      "What are the main maintainability hotspots in this repository?",
    ],
    readTitle: "How to read a result",
    read: [
      ["Grounded evidence", "The answer is supported by indexed code and can be checked through cited lines."],
      ["Insufficient evidence", "The system could not retrieve strong enough code support and should not be trusted for a firm conclusion."],
    ],
    faqTitle: "Common questions",
    faq: [
      ["Does the system execute my source code?", "No. The repository is processed through a read-only analysis flow and is inspected as code evidence rather than executed application logic."],
      ["Why can results vary between repositories?", "Accuracy depends on how much relevant code was indexed, how clearly the repository is structured, and how well the question matches the available evidence."],
      ["How should I judge an answer?", "Treat the answer as an evidence-supported analysis draft. Open the cited lines and confirm the conclusion with your own technical reading."],
      ["Can this replace manual review?", "Not fully. Archaeologist reduces search time and surfaces evidence quickly, but code review, testing, and technical validation are still required."],
    ],
    support: "Need more help? Visit technical support",
  },
  vi: {
    intro: "Sổ tay sử dụng thực tế cho việc phân tích repository, đối chiếu bằng chứng và tra cứu mã nguồn có kiểm chứng.",
    stepsTitle: "Quy trình phân tích 4 bước",
    steps: [
      ["Bước 1 — Thêm repository", "Dán đường dẫn GitHub công khai và tạo tác vụ phân tích trực tiếp trên trình duyệt."],
      ["Bước 2 — Phân tích và lập chỉ mục", "Worker tải kho mã an toàn, ghi lại commit SHA, bóc tách symbol và tạo tập bằng chứng để tra cứu."],
      ["Bước 3 — Soi và điều hướng mã", "Đặt câu hỏi có trọng tâm, xem tín hiệu kỹ thuật và mở đúng tệp, đúng phạm vi dòng được dẫn chứng."],
      ["Bước 4 — Rà soát kết luận", "Đọc lại đoạn mã được trích dẫn, kiểm tra ngữ cảnh và quyết định bước kỹ thuật tiếp theo."],
    ],
    action: "Phân tích repository",
    beforeTitle: "Trước khi bắt đầu",
    before: [
      ["Quyền truy cập", "Sử dụng đường dẫn GitHub công khai hợp lệ."],
      ["Đăng nhập", "Nên đăng nhập nếu bạn muốn lưu repository vào thư viện làm việc."],
      ["Phạm vi", "Python hiện được phân tích sâu hơn. Các ngôn ngữ khác được lập chỉ mục ở mức nhẹ hơn."],
      ["An toàn", "Nền tảng tập trung vào phân tích mã nguồn như dữ liệu và bằng chứng. Trong luồng phân tích thông thường, hệ thống không nhằm mục tiêu chạy mã người dùng."],
    ],
    areasTitle: "Các khu vực phân tích chính",
    areasLead: "Mỗi khu vực giúp bạn nhìn cùng một snapshot repository dưới một góc độ khác nhau.",
    areas: [
      { icon: "overview", title: "Tổng quan", body: "Tóm tắt repository, số lượng tệp đã lập chỉ mục và trạng thái phân tích." },
      { icon: "file", title: "Trình đọc mã nguồn", body: "Duyệt tệp, xem số dòng và mở chính xác phạm vi bằng chứng." },
      { icon: "sparkles", title: "AI giám định", body: "Đặt câu hỏi có trọng tâm và nhận kết quả gắn với mã nguồn đã lập chỉ mục." },
      { icon: "clock", title: "Lịch sử", body: "Xem ngữ cảnh commit và theo dõi sự phát triển của repository theo thời gian." },
      { icon: "graph", title: "Phụ thuộc", body: "Quan sát liên kết giữa các tệp và phạm vi ảnh hưởng có khả năng lan rộng." },
      { icon: "audit", title: "Nợ kỹ thuật", body: "Phát hiện tệp lớn, phụ thuộc chặt và các điểm gây khó bảo trì." },
      { icon: "branch", title: "Pull Requests", body: "Kết nối thay đổi mã nguồn với thảo luận và lịch sử review trên GitHub." },
    ],
    inspectorTitle: "Nền tảng phân tích mã nguồn",
    inspectorLead: "Archaeologist được định vị là công cụ tra cứu repository và giám định mã nguồn có dẫn chứng, không phải chatbot trả lời chung chung.",
    inspectorModes: [
      { title: "Cấu trúc kho mã", desc: "Mô tả bố cục codebase, các module chính và ranh giới trách nhiệm trong hệ thống." },
      { title: "Giám định có bằng chứng", desc: "Kết luận chỉ có giá trị khi gắn với tệp, symbol và phạm vi dòng đã được lập chỉ mục." },
      { title: "Đánh giá tác động khi sửa", desc: "Giúp ước lượng những tệp và module nào có thể bị ảnh hưởng trước khi chỉnh sửa mã nguồn." },
      { title: "Tín hiệu chất lượng kỹ thuật", desc: "Nêu bật rủi ro bảo trì như tệp quá lớn, phụ thuộc dày và các điểm nóng khó kiểm soát." },
    ],
    apiGuideTitle: "Thực nghiệm và độ tin cậy",
    apiGuideLead: "Muốn kết quả chính xác hơn, hệ thống cần được kiểm thử trên nhiều kho mã và người dùng cần đối chiếu lại bằng chứng trước khi kết luận.",
    apiSteps: [
      { step: "01", title: "Thử trên nhiều codebase", desc: "Nên kiểm thử trên nhiều repository có kích thước và cấu trúc khác nhau để đánh giá chất lượng truy xuất một cách thực tế." },
      { step: "02", title: "Đặt nhiều câu hỏi có trọng tâm", desc: "Không nên dựa vào một câu hỏi duy nhất. Hãy thử nhiều truy vấn để kiểm tra độ nhất quán của kết quả." },
      { step: "03", title: "Đọc lại dòng mã được dẫn", desc: "Luôn mở lại đường dẫn tệp và phạm vi dòng được trích dẫn trước khi tin vào kết luận của hệ thống." },
      { step: "04", title: "Giữ bước rà soát của con người", desc: "Hệ thống hỗ trợ tra cứu và tổng hợp bằng chứng, nhưng quyết định cuối cùng vẫn cần người dùng hoặc người review xác nhận." },
    ],
    askTitle: "Cách đặt câu hỏi hiệu quả",
    askLead: "Câu hỏi rõ phạm vi giúp truy xuất bằng chứng tốt hơn và cho ra kết quả hữu ích hơn.",
    askTips: [
      "Nêu rõ tên tệp, hàm hoặc class cần kiểm tra.",
      "Mỗi lần chỉ nên hỏi một vấn đề cụ thể như bảo mật, tác động sửa đổi, quyền sở hữu hoặc nợ kỹ thuật.",
      "Ưu tiên kiểm tra lại các dòng mã được trích dẫn trước khi sử dụng kết quả.",
    ],
    promptsLabel: "Câu hỏi mẫu",
    prompts: [
      "Vòng đời xử lý một HTTP Request được định tuyến ở đâu?",
      "Những module nào chịu trách nhiệm xác thực người dùng?",
      "Nếu sửa service truy xuất dữ liệu thì các tệp nào có thể bị ảnh hưởng?",
      "Những điểm nóng về khả năng bảo trì trong repository là gì?",
    ],
    readTitle: "Cách đọc kết quả",
    read: [
      ["Đã có bằng chứng", "Kết quả được hỗ trợ bởi mã nguồn đã lập chỉ mục và có thể kiểm tra lại qua các phạm vi dòng được dẫn."],
      ["Chưa đủ bằng chứng", "Hệ thống chưa truy xuất đủ mã nguồn liên quan để đưa ra kết luận mạnh, vì vậy không nên xem đó là kết luận chắc chắn."],
    ],
    faqTitle: "Câu hỏi thường gặp",
    faq: [
      ["Hệ thống có chạy mã nguồn của tôi không?", "Không. Repository được xử lý theo luồng phân tích chỉ đọc và được xem như nguồn bằng chứng mã nguồn, không phải logic ứng dụng để chạy trực tiếp."],
      ["Vì sao kết quả có thể khác nhau giữa các repository?", "Độ chính xác phụ thuộc vào lượng mã liên quan đã được lập chỉ mục, độ rõ ràng của cấu trúc dự án và việc câu hỏi có bám đúng bằng chứng hiện có hay không."],
      ["Nên đánh giá câu trả lời như thế nào?", "Hãy xem đó là một bản phân tích có dẫn chứng. Bạn nên mở các dòng mã được trích dẫn và tự đối chiếu trước khi kết luận."],
      ["Hệ thống có thể thay thế hoàn toàn code review thủ công không?", "Chưa. Archaeologist giúp rút ngắn thời gian tìm kiếm và gom bằng chứng, nhưng code review, kiểm thử và xác nhận kỹ thuật vẫn rất cần thiết."],
    ],
    support: "Cần thêm trợ giúp? Xem khu vực hỗ trợ kỹ thuật",
  },
};

export default function GuidePage() {
  const { locale, t } = useI18n();
  const copy = content[locale];

  return (
    <article className="wrap resource-page guide-page">
      <header className="resource-head">
        <span className="page-tag">
          <Icon name="sparkles" size={14} />
          {locale === "vi" ? "SỔ TAY KỸ THUẬT" : "TECHNICAL HANDBOOK"}
        </span>
        <h1>{t.guideTitle}</h1>
        <p>{copy.intro}</p>
      </header>

      <div className="resource-columns">
        <section className="guide-instructions">
          <h2>{copy.stepsTitle}</h2>
          <ol className="guide-steps">
            {copy.steps.map(([title, body]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
          <Link className="primary resource-link" href="/#analyze">
            {copy.action}
            <Icon name="arrow" size={16} />
          </Link>
        </section>

        <aside className="resource-aside">
          <Icon name="compass" size={24} />
          <h2>{copy.beforeTitle}</h2>
          <dl>
            {copy.before.map(([title, body]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <section className="rs-section" aria-labelledby="guide-areas">
        <h2 id="guide-areas">{copy.areasTitle}</h2>
        <p className="rs-lead">{copy.areasLead}</p>
        <div className="card-grid">
          {copy.areas.map(({ icon, title, body }) => (
            <article key={title} className="info-card">
              <Icon name={icon} size={22} />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rs-section inspector-guide-section">
        <div className="inspector-guide-header">
          <span className="inspector-badge minimalist">
            {locale === "vi" ? "NỀN TẢNG PHÂN TÍCH" : "ANALYSIS MODEL"}
          </span>
          <h2>{copy.inspectorTitle}</h2>
          <p className="rs-lead">{copy.inspectorLead}</p>
        </div>

        <div className="card-grid cols-2">
          {copy.inspectorModes.map((m) => (
            <article key={m.title} className="info-card inspector-mode-card">
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rs-section api-guide-section">
        <div className="api-guide-header">
          <span className="inspector-badge minimalist">
            {locale === "vi" ? "THỰC NGHIỆM" : "VALIDATION"}
          </span>
          <h2>{copy.apiGuideTitle}</h2>
          <p className="rs-lead">{copy.apiGuideLead}</p>
        </div>

        <div className="api-steps-flow">
          {copy.apiSteps.map((s) => (
            <div key={s.step} className="api-step-card">
              <div className="api-step-num">{s.step}</div>
              <div className="api-step-body">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="resource-columns even rs-section">
        <section className="guide-instructions" aria-labelledby="guide-ask">
          <h2 id="guide-ask">{copy.askTitle}</h2>
          <p className="rs-lead">{copy.askLead}</p>
          <ul className="tick-list">
            {copy.askTips.map((tip) => (
              <li key={tip}>
                <Icon name="check" size={16} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <p className="chip-label">{copy.promptsLabel}</p>
          <ul className="prompt-list">
            {copy.prompts.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <aside className="resource-aside">
          <Icon name="quote" size={24} />
          <h2>{copy.readTitle}</h2>
          <dl>
            {copy.read.map(([title, body], i) => (
              <div key={title}>
                <dt>
                  <span className={"dot " + (i === 0 ? "ok" : "warn")} />
                  {title}
                </dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <section className="rs-section" aria-labelledby="guide-faq">
        <h2 id="guide-faq">{copy.faqTitle}</h2>
        <div className="faq">
          {copy.faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        <Link className="text-action resource-link" href="/#support">
          {copy.support}
          <Icon name="arrow" size={15} />
        </Link>
      </section>
    </article>
  );
}
