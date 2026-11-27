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
  inspectorModes: { title: string; desc: string; sample: string }[];
  apiGuideTitle: string;
  apiGuideLead: string;
  apiSteps: { step: string; title: string; desc: string; code?: string }[];
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
    intro: "Step-by-step technical guide for deep codebase archaeology, evidence verification, and configuring custom LLM APIs.",
    stepsTitle: "Complete 4-Step Analysis Workflow",
    steps: [
      ["Step 1: Ingest Repository", "Paste any public GitHub repository URL (e.g., https://github.com/pallets/click). Sign in with Google, GitHub, or Magic Link to automatically save the repository and its immutable snapshots in your personal workspace."],
      ["Step 2: AST Extraction & Indexing", "The background worker performs a shallow clone, captures the exact commit SHA, extracts abstract syntax trees (functions, classes, imports), detects dependency graphs, and slices code into semantic chunks."],
      ["Step 3: Run AI Deep Code Inspection", "Select the 'AI Q&A' tab or choose one of the 5 instant inspection modes: Architecture Anatomy, Security & Vulnerabilities, Blast Radius Impact, Debt Hotspots, or Historical Provenance."],
      ["Step 4: Verify Citing Evidences", "Click any citation badge [E1], [E2] to jump directly into the source code reader at the exact highlighted line numbers, or open the immutable commit blob on GitHub."],
    ],
    action: "Analyze a Repository Now",
    beforeTitle: "Pre-Flight Checklist",
    before: [
      ["Repository URL", "Must be a valid, public GitHub repository in the format https://github.com/owner/repo."],
      ["Authentication", "Recommended. Signing in enables persistent workspace libraries and session management."],
      ["Parser Scope", "Python is parsed with full AST; JavaScript/TypeScript with module symbols; other languages are text-indexed."],
      ["Safety Boundary", "Code is strictly analyzed as text. No user code is ever executed or modified."],
    ],
    areasTitle: "7 Specialized Analysis Panels",
    areasLead: "Every tab investigates a unique dimension of the exact same commit snapshot.",
    areas: [
      { icon: "overview", title: "Overview", body: "Total file counts, symbols, dependencies, chunks, Pull Requests, and revision trends." },
      { icon: "file", title: "Source Code & Explorer", body: "Interactive file tree with line numbers, syntax view, and citation highlighting." },
      { icon: "sparkles", title: "AI Code Inspector", body: "Deep AST code dissection, security audits, and risk assessment backed by verified evidence." },
      { icon: "clock", title: "Commit Timeline", body: "Visual chronological strata of commit changes, author attributions, and additions/deletions." },
      { icon: "graph", title: "Dependency Graph", body: "Interactive dependency graph mapping internal imports and multi-hop impact blast radiuses." },
      { icon: "audit", title: "Technical Debt", body: "Automated rule detection for God files, God functions, and circular import cycles." },
      { icon: "branch", title: "Pull Requests", body: "Correlates commit changes with original GitHub pull request discussions and merge metadata." },
    ],
    inspectorTitle: "AI Code Inspector vs Generic Chatbot",
    inspectorLead: "Archaeologist is an evidence-first code audit engine, not a casual conversational chatbot.",
    inspectorModes: [
      {
        title: "🏛️ Architecture Anatomy",
        desc: "Dissects entrypoints, data flow pathways, and cross-module communication without hallucinating.",
        sample: "Analyze the core data pipeline and show which module manages database transactions.",
      },
      {
        title: "🛡️ Security & Vulnerability Audit",
        desc: "Audits authentication flow, token permissions, input validation, and potential secret leaks.",
        sample: "Inspect user authentication and identify where external requests are sanitized.",
      },
      {
        title: "⚡ Blast Radius & Change Risk",
        desc: "Pinpoints high-risk functions where modifying code will ripple across multiple dependents.",
        sample: "Which files will break if we modify the signature of core.py:Command?",
      },
      {
        title: "🧹 Technical Debt Hotspots",
        desc: "Detects monolithic files (>1000 lines), cyclomatic complexity spikes, and tight coupling.",
        sample: "Identify the top 3 files with excessive coupling that require refactoring.",
      },
      {
        title: "📜 Historical Provenance",
        desc: "Traces the evolution of key algorithms across commit milestones and Pull Request rationales.",
        sample: "Why was the streaming parser rewritten in commit v2.1?",
      },
    ],
    apiGuideTitle: "Step-by-Step Guide: Attaching Your LLM API Key",
    apiGuideLead: "You can easily power the AI Code Inspector with your own Google Gemini, OpenAI, or local Ollama model.",
    apiSteps: [
      {
        step: "01",
        title: "Get a Free Google Gemini API Key",
        desc: "Go to Google AI Studio (https://aistudio.google.com/app/apikey), sign in with Google, and click 'Create API Key'. Gemini 2.5 Flash is fast, powerful, and includes generous free quotas.",
      },
      {
        step: "02",
        title: "Open the .env Configuration File",
        desc: "In your project root directory, open the .env file with any text editor (VS Code, Notepad, Vim).",
      },
      {
        step: "03",
        title: "Set LLM Environment Variables",
        desc: "Fill in the LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL fields:",
        code: `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai\nLLM_API_KEY=AIzaSyYourGeneratedSecretKeyHere\nLLM_MODEL=gemini-2.5-flash\nLLM_TIMEOUT_SECONDS=45`,
      },
      {
        step: "04",
        title: "Restart the Backend Service",
        desc: "Restart your Docker stack so the backend loads your new credentials:",
        code: `# On Linux / macOS:\ndocker compose up -d backend\n\n# Or on Windows:\n.\\deploy.ps1`,
      },
      {
        step: "05",
        title: "Verify Configuration Status",
        desc: "Open http://localhost:8000/api/auth/status in your browser. Verify that 'llm_configured' is true and 'message' is 'ok'. The AI Inspector is now fully active!",
      },
    ],
    askTitle: "Best Practices for Deep Code Inquiries",
    askLead: "Specific, targeted questions yield the most precise citing evidence.",
    askTips: [
      "Target specific symbols: Name the class, method, or file (e.g., 'In auth.py, how is create_access_token signed?').",
      "Ask for structural relationships: Inquire about data flows between specific packages.",
      "Always inspect cited lines: Click [E1], [E2] to review the highlighted code before acting.",
    ],
    promptsLabel: "Recommended Inspection Queries",
    prompts: [
      "Where is the HTTP request lifecycle handled?",
      "Which files import and instantiate DatabaseSession?",
      "Audit potential SQL injection vectors in repository queries.",
      "List all classes that inherit from BaseParser.",
    ],
    readTitle: "Interpreting Inspection Evidence",
    read: [
      ["GROUNDED EVIDENCE VERIFIED", "The conclusion is directly proven by retrieved code chunks. Inspect file paths, line ranges, and relevance scores."],
      ["INSUFFICIENT EVIDENCE", "No code chunk passed the evidence threshold. The AI deliberately halts rather than hallucinating false code."],
    ],
    faqTitle: "Frequently Asked Questions",
    faq: [
      ["Does Archaeologist run or execute my repository code?", "Never. The repository is cloned read-only. Code is parsed solely as static text and AST tokens in an isolated container. No user code is ever executed or compiled."],
      ["Can I connect private repositories?", "Private repository ingestion via GitHub App integration is built into the architecture. In production, configure GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY to grant fine-grained read-only access."],
      ["How does the AI prevent hallucinating incorrect methods?", "Every query triggers cosine similarity retrieval against chunked AST tokens. If the top-scoring chunks fall below the minimum threshold (score < 0.08), the synthesis returns 'Insufficient Evidence' and refuses to guess."],
      ["What is the difference between this and ChatGPT / Copilot?", "Standard chat tools generate code from probabilistic text prediction without ground-truth verification. Archaeologist acts as a forensic archaeologist: it indexes the AST graph, proves every claim with static code line numbers, and maps historical causal evolution."],
    ],
    support: "Have more questions? Contact Technical Support",
  },
  vi: {
    intro: "Hướng dẫn kỹ thuật chi tiết từng bước để soi mã nguồn chuyên sâu, thẩm tra bằng chứng và cấu hình API AI.",
    stepsTitle: "Quy trình Phân tích 4 Bước Hoàn chỉnh",
    steps: [
      ["Bước 1: Nạp kho mã GitHub", "Dán đường dẫn kho GitHub công khai (ví dụ: https://github.com/pallets/click). Hãy đăng nhập bằng Google, GitHub hoặc Magic Link để tự động lưu kho và các snapshot bất biến vào thư viện cá nhân."],
      ["Bước 2: Bóc tách AST & Lập chỉ mục", "Bộ xử lý nền (Worker) tải kho an toàn, chốt mã commit SHA, bóc tách cây cú pháp trừu tượng AST (hàm, lớp, module import), dựng đồ thị phụ thuộc và phân mảnh code thành các chunk ngữ nghĩa."],
      ["Bước 3: Khởi chạy AI Soi Code Chuyên Sâu", "Chọn tab 'Hỏi đáp AI' (AI Code Inspector) hoặc chọn 1 trong 5 chế độ giám định tức thì: Giải phẫu Kiến trúc, Soi Lỗ hổng Bảo mật, Rủi ro khi Sửa đổi, Nợ kỹ thuật, hoặc Lịch sử Tiến hóa."],
      ["Bước 4: Thẩm tra Bằng chứng Đối chiếu", "Nhấp vào bất kỳ huy hiệu bằng chứng [E1], [E2] để nhảy thẳng vào trình đọc mã nguồn tại đúng khoảng dòng được highlight, hoặc mở trang mã nguồn gốc trên GitHub."],
    ],
    action: "Phân tích một Kho mã Ngay",
    beforeTitle: "Danh sách Kiểm tra Trước khi Chạy",
    before: [
      ["Đường dẫn kho mã", "Phải là kho GitHub công khai hợp lệ có dạng https://github.com/owner/repo."],
      ["Xác thực tài khoản", "Khuyên dùng. Đăng nhập giúp kích hoạt Thư viện cá nhân và quản lý phiên làm việc đa thiết bị."],
      ["Phạm vi phân tích cú pháp", "Python được bóc tách AST toàn diện; JavaScript/TypeScript trích xuất symbol module; ngôn ngữ khác lập chỉ mục văn bản."],
      ["Ranh giới an toàn tuyệt đối", "Mã nguồn được phân tích dưới dạng văn bản tĩnh. Tuyệt đối không có lệnh nào trong repo người dùng được phép thực thi."],
    ],
    areasTitle: "7 Tab Phân tích Chuyên sâu",
    areasLead: "Mỗi tab giải quyết một góc nhìn chuyên biệt về cùng một commit snapshot bất biến.",
    areas: [
      { icon: "overview", title: "Tổng quan (Overview)", body: "Thống kê tổng số file, hàm/lớp, phụ thuộc, chunk, Pull Request và biểu đồ xu hướng." },
      { icon: "file", title: "Mã nguồn & Cây tệp (Files)", body: "Cây thư mục tương tác, đọc mã kèm số dòng và tô sáng các dòng bằng chứng." },
      { icon: "sparkles", title: "AI Soi Code (Code Inspector)", body: "Giám định kiến trúc, mổ xẻ hàm/class, thẩm tra bảo mật và đối chiếu bằng chứng tĩnh." },
      { icon: "clock", title: "Dòng thời gian (Timeline)", body: "Dòng thời gian commit trực quan hóa độ lớn thay đổi (add/del) theo từng tác giả." },
      { icon: "graph", title: "Đồ thị Phụ thuộc (Graph)", body: "Biểu đồ phụ thuộc tương tác SVG và phân tích bán kính ảnh hưởng lan truyền đa tầng." },
      { icon: "audit", title: "Nợ kỹ thuật (Debt)", body: "Tự động phát hiện các God file, God function và vòng lặp import tròn cần refactor." },
      { icon: "branch", title: "Pull Requests", body: "Kết nối lịch sử commit với các cuộc thảo luận và thông tin sáp nhập PR trên GitHub." },
    ],
    inspectorTitle: "AI Soi Code Chuyên Sâu vs Chatbot Thông Thường",
    inspectorLead: "Archaeologist là công cụ giám định và khảo cổ mã nguồn có bằng chứng, không phải chatbot trò chuyện vu vơ.",
    inspectorModes: [
      {
        title: "🏛️ Giải phẫu Kiến trúc Hệ thống",
        desc: "Bóc tách cấu trúc phân lớp, luồng dữ liệu chính và cách các module kết nối mà không suy diễn.",
        sample: "Phân tích kiến trúc luồng dữ liệu chính và chỉ ra module nào quản lý lưu trữ database.",
      },
      {
        title: "🛡️ Giám định An ninh & Lỗ hổng",
        desc: "Soi luồng xác thực, kiểm tra token, xác thực đầu vào và phát hiện rò rỉ secret tiềm ẩn.",
        sample: "Kiểm tra cơ chế xác thực người dùng và vị trí các dữ liệu bên ngoài được kiểm tra an toàn.",
      },
      {
        title: "⚡ Bán kính Tác động & Rủi ro khi Sửa đổi",
        desc: "Chỉ ra các module và hàm có bán kính ảnh hưởng (Blast Radius) lớn nhất khi bị can thiệp.",
        sample: "Những tệp nào có nguy cơ bị lỗi nếu chúng ta sửa đổi hàm khởi tạo trong core.py?",
      },
      {
        title: "🧹 Điểm nghẽn Nợ kỹ thuật",
        desc: "Phát hiện các file nguyên khối (>1000 dòng), độ phức tạp Cyclomatic cao và module phụ thuộc quá chặt.",
        sample: "Chỉ ra 3 tệp có độ phụ thuộc cao nhất cần được chia nhỏ và tái cấu trúc.",
      },
      {
        title: "📜 Đào bới Nguyên nhân & Lịch sử",
        desc: "Truy vết lý do tại sao đoạn mã được viết như hiện tại dựa trên các commit và PR trong quá khứ.",
        sample: "Vì sao bộ phân tích cú pháp streaming được viết lại trong commit v2.1?",
      },
    ],
    apiGuideTitle: "Hướng Dẫn Từng Bước: Tự Gắn API Key AI Cho Hệ Thống",
    apiGuideLead: "Bạn có thể dễ dàng gắn API Key của Google Gemini, OpenAI hoặc mô hình Ollama chạy trên máy.",
    apiSteps: [
      {
        step: "01",
        title: "Lấy API Key Miễn phí từ Google Gemini",
        desc: "Truy cập Google AI Studio (https://aistudio.google.com/app/apikey), đăng nhập bằng tài khoản Google và bấm 'Create API Key'. Mô hình Gemini 2.5 Flash vừa cực kỳ thông minh, tốc độ cao lại có hạn mức miễn phí rộng rãi.",
      },
      {
        step: "02",
        title: "Mở Tệp Cấu hình .env",
        desc: "Tại thư mục gốc dự án, mở tệp .env bằng bất kỳ trình soạn thảo nào (VS Code, Notepad, v.v.).",
      },
      {
        step: "03",
        title: "Điền Cấu hình Biến Môi trường LLM",
        desc: "Cập nhật 4 dòng thông số sau với API key của bạn:",
        code: `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai\nLLM_API_KEY=AIzaSyKhoaBimatCuaBanOday\nLLM_MODEL=gemini-2.5-flash\nLLM_TIMEOUT_SECONDS=45`,
      },
      {
        step: "04",
        title: "Khởi động lại Dịch vụ Backend",
        desc: "Chạy lệnh để backend nạp cấu hình mới:",
        code: `# Trên Linux / VPS:\ndocker compose up -d backend\n\n# Hoặc trên Windows PowerShell:\n.\\deploy.ps1`,
      },
      {
        step: "05",
        title: "Kiểm tra Trạng thái Hoạt động",
        desc: "Truy cập đường dẫn http://localhost:8000/api/auth/status trên trình duyệt. Kiểm tra trường 'llm_configured' chuyển thành true. Hệ thống AI Soi Code đã sẵn sàng phục vụ 100%!",
      },
    ],
    askTitle: "Kinh nghiệm Đặt Câu hỏi Soi Code Hiệu quả",
    askLead: "Câu hỏi càng có trọng tâm kỹ thuật thì bằng chứng đối chiếu trả về càng chính xác.",
    askTips: [
      "Nêu cụ thể tên hàm, class hoặc tệp: Ví dụ: 'Trong auth.py, token JWT được ký bằng thuật toán gì?'.",
      "Hỏi về quan hệ kiến trúc: 'Module retrieval.py kết nối với database qua các truy vấn nào?'.",
      "Luôn thẩm tra bằng chứng: Nhấp vào [E1], [E2] để kiểm tra số dòng code thực tế trước khi tin cậy.",
    ],
    promptsLabel: "Các Câu hỏi Mẫu Nên Thử",
    prompts: [
      "Vòng đời xử lý một HTTP Request được định tuyến ở đâu?",
      "Những file nào import và khởi tạo DatabaseSession?",
      "Soi các lỗ hổng SQL Injection tiềm ẩn trong các câu truy vấn.",
      "Liệt kê tất cả các class kế thừa từ BaseParser.",
    ],
    readTitle: "Cách Đọc Kết quả Giám định",
    read: [
      ["ĐÃ XÁC THỰC BẰNG CHỨNG (GROUNDED)", "Kết luận được chứng minh trực tiếp từ các đoạn mã nguồn AST đã lập chỉ mục. Kiểm tra đường dẫn tệp, dòng mã và điểm số liên quan."],
      ["CHƯA ĐỦ BẰNG CHỨNG XÁC THỰC", "Không có đoạn mã nào vượt qua ngưỡng tin cậy. Hệ thống chủ động từ chối kết luận để tránh ảo giác sai lệch."],
    ],
    faqTitle: "Câu Hỏi Thường Gặp",
    faq: [
      ["Hệ thống có chạy mã nguồn của tôi không?", "Tuyệt đối không. Kho mã được clone ở chế độ chỉ đọc (read-only). Mã chỉ được phân tích cú pháp tĩnh dạng văn bản và AST. Không có bất kỳ lệnh nào trong repository người dùng được phép thực thi."],
      ["Tôi có phân tích được kho GitHub riêng tư (Private) không?", "Kiến trúc hệ thống đã hỗ trợ sẵn việc tích hợp GitHub App. Khi triển khai nội bộ doanh nghiệp, cấu hình GITHUB_APP_ID và GITHUB_APP_PRIVATE_KEY để cấp quyền đọc an toàn."],
      ["Làm sao AI không nói bừa hoặc bị ảo giác (hallucination)?", "Mọi câu hỏi đều kích hoạt truy xuất Cosine Similarity đối chiếu với các chunk mã nguồn AST. Nếu điểm số không đạt ngưỡng (score < 0.08), hệ thống bắt buộc trả về 'Chưa đủ bằng chứng'."],
      ["Điểm khác biệt giữa Archaeologist và ChatGPT / Copilot là gì?", "Các công cụ chat thông thường sinh văn bản dựa trên xác suất từ ngữ mà không kiểm chứng sự thật. Archaeologist đóng vai trò giám định khảo cổ: dựng đồ thị AST, chứng minh mọi nhận định bằng số dòng code thực tế `#L...-L...` và truy vết lịch sử tiến hóa commit."],
    ],
    support: "Cần thêm trợ giúp? Xem kênh Hỗ trợ Kỹ thuật",
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

      {/* 4 Steps Section */}
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

      {/* 7 Panels Tour */}
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

      {/* AI Inspector vs Chatbot Section */}
      <section className="rs-section inspector-guide-section">
        <div className="inspector-guide-header">
          <span className="inspector-badge">
            <Icon name="sparkles" size={14} />
            {locale === "vi" ? "BẢN CHẤT CÔNG NGHỆ" : "CORE TECHNOLOGY"}
          </span>
          <h2>{copy.inspectorTitle}</h2>
          <p className="rs-lead">{copy.inspectorLead}</p>
        </div>

        <div className="card-grid cols-2">
          {copy.inspectorModes.map((m) => (
            <article key={m.title} className="info-card inspector-mode-card">
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
              <div className="sample-query-box">
                <span className="sample-label">
                  <Icon name="quote" size={12} />
                  {locale === "vi" ? "Mẫu câu lệnh soi code:" : "Sample Inspection Query:"}
                </span>
                <code>{m.sample}</code>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Step-by-Step API Key Attachment Guide */}
      <section className="rs-section api-guide-section">
        <div className="api-guide-header">
          <span className="inspector-badge">
            <Icon name="key" size={14} />
            {locale === "vi" ? "HƯỚNG DẪN CẤU HÌNH API" : "API CONFIGURATION"}
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
                {s.code && (
                  <pre className="code-block">
                    <code>{s.code}</code>
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tips and Reading Evidence */}
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

      {/* FAQ */}
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
