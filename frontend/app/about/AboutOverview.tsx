"use client";

import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import Icon, { type IconName } from "../components/Icon";

type Item = { icon: IconName; title: string; body: string };
type Copy = {
  featuresTitle: string;
  features: Item[];
  flowTitle: string;
  flow: [string, string][];
  architecture: string;
  components: [string, string][];
  stackLabel: string;
  stack: string[];
  principlesTitle: string;
  principles: string[];
  citations: string;
  citationText: string;
  citationExample: string;
  evidence: string;
  limitsTitle: string;
  limits: string[];
  disclaimer: string;
};

const content: Record<"en" | "vi", Copy> = {
  en: {
    featuresTitle: "What you can do",
    features: [
      { icon: "quote", title: "Grounded Q&A", body: "Ask in plain language. Every answer cites files, lines and commits. When the evidence is too thin, it says so instead of guessing." },
      { icon: "file", title: "Source code explorer", body: "Browse the file tree, read code with line numbers and filter files by path, all in your browser." },
      { icon: "clock", title: "Commits and Pull Requests", body: "Follow the commit timeline and the Pull Requests collected from GitHub to see how the code evolved." },
      { icon: "graph", title: "Dependencies and impact", body: "See which files import each other and which ones a change may affect, up to two steps away." },
      { icon: "audit", title: "Technical debt signals", body: "Spot oversized files and functions, modules with heavy coupling and circular dependencies, each with evidence." },
      { icon: "commit", title: "Pinned to a commit SHA", body: "Every analysis belongs to one commit, so a citation always points at the exact revision that was read." },
    ],
    flowTitle: "How an analysis runs",
    flow: [
      ["Submit a repository", "Paste a public GitHub URL. The API validates it and queues an analysis job."],
      ["Fetch and filter", "The worker clones the repository safely, records the commit SHA and skips binaries, build output, vendored code, secrets and oversized files."],
      ["Parse and index", "It extracts functions, classes and imports, maps commits and Pull Requests, then splits the code into symbol-sized chunks for search."],
      ["Explore and ask", "Read the results, ask questions and open any citation on GitHub."],
    ],
    architecture: "Architecture",
    components: [
      ["Next.js interface", "Where you submit a repository and explore files, history, graphs and answers."],
      ["FastAPI and PostgreSQL", "The API handles sign-in, access and job queueing. PostgreSQL stores jobs and every indexed result."],
      ["Analysis worker", "A separate Python service that fetches the repository and builds the index, so heavy work never blocks the web app."],
    ],
    stackLabel: "Built with",
    stack: ["Next.js", "FastAPI", "PostgreSQL", "Python AST", "Hybrid retrieval", "Docker Compose", "Optional LLM"],
    principlesTitle: "Design principles",
    principles: [
      "Evidence first. No matching evidence means no conclusion.",
      "Read-only. Analyzed code is never executed and never modified.",
      "Suggestions only. Findings are leads to verify, not verdicts.",
      "Your data stays yours. Only repositories you are allowed to see are analyzed.",
    ],
    citations: "How to read a citation",
    citationText: "A citation combines a file path, a commit SHA and a line range. #L12-L18 highlights lines 12 to 18. Opening it shows that exact revision on GitHub, even after the branch moves on.",
    citationExample: "src/app.py · a1b2c3d · #L12-L18",
    evidence: "When the indexed code gives too little evidence, the answer says it could not be verified.",
    limitsTitle: "Current scope",
    limits: [
      "Public GitHub repositories. Private repositories are planned.",
      "Python is parsed with a full AST. JavaScript and TypeScript are supported at a basic level.",
      "Up to 5,000 files per repository, each up to 256 KB.",
    ],
    disclaimer: "Archaeologist is a prototype that supports your analysis. It does not replace code review, security testing or an engineer’s judgment.",
  },
  vi: {
    featuresTitle: "Bạn có thể làm gì",
    features: [
      { icon: "quote", title: "Hỏi đáp có dẫn chứng", body: "Đặt câu hỏi bằng ngôn ngữ tự nhiên. Mỗi câu trả lời kèm tệp, dòng mã và commit. Nếu chưa đủ bằng chứng, hệ thống nói rõ thay vì đoán." },
      { icon: "file", title: "Khám phá mã nguồn", body: "Duyệt cây tệp, đọc mã kèm số dòng và lọc tệp theo đường dẫn ngay trên trình duyệt." },
      { icon: "clock", title: "Commit và Pull Request", body: "Xem dòng thời gian commit và các Pull Request lấy từ GitHub để hiểu mã đã thay đổi như thế nào." },
      { icon: "graph", title: "Phụ thuộc và phạm vi ảnh hưởng", body: "Biết tệp nào import tệp nào và những tệp có thể bị ảnh hưởng khi sửa mã, tối đa hai bước." },
      { icon: "audit", title: "Dấu hiệu nợ kỹ thuật", body: "Phát hiện tệp, hàm quá lớn, module phụ thuộc quá nhiều và vòng phụ thuộc, kèm bằng chứng." },
      { icon: "commit", title: "Cố định theo mã commit", body: "Mỗi lần phân tích gắn với một commit SHA, nên trích dẫn luôn trỏ đúng phiên bản đã đọc." },
    ],
    flowTitle: "Một lượt phân tích diễn ra thế nào",
    flow: [
      ["Gửi kho mã", "Dán đường dẫn kho GitHub công khai. API kiểm tra rồi đưa tác vụ phân tích vào hàng đợi."],
      ["Tải và lọc", "Bộ xử lý tải kho an toàn, ghi lại commit SHA và bỏ qua tệp nhị phân, thư mục build, mã vendor, tệp bí mật và tệp quá lớn."],
      ["Phân tích và lập chỉ mục", "Trích xuất hàm, lớp, quan hệ import; ánh xạ commit, Pull Request; chia mã thành các đoạn theo hàm để tìm kiếm."],
      ["Khám phá và hỏi đáp", "Đọc kết quả, đặt câu hỏi và mở bất kỳ trích dẫn nào trên GitHub."],
    ],
    architecture: "Kiến trúc hệ thống",
    components: [
      ["Giao diện Next.js", "Nơi bạn gửi kho mã, xem tệp, lịch sử, đồ thị phụ thuộc và câu trả lời."],
      ["API FastAPI và PostgreSQL", "API lo đăng nhập, phân quyền và hàng đợi tác vụ. PostgreSQL lưu tác vụ và toàn bộ kết quả đã lập chỉ mục."],
      ["Bộ xử lý phân tích", "Dịch vụ Python riêng, tải kho và dựng chỉ mục, để việc nặng không làm chậm ứng dụng web."],
    ],
    stackLabel: "Công nghệ",
    stack: ["Next.js", "FastAPI", "PostgreSQL", "Python AST", "Tìm kiếm lai", "Docker Compose", "LLM (tùy chọn)"],
    principlesTitle: "Nguyên tắc thiết kế",
    principles: [
      "Bằng chứng trước tiên. Không có bằng chứng thì không kết luận.",
      "Chỉ đọc. Mã được phân tích không bao giờ bị chạy hay bị sửa.",
      "Chỉ gợi ý. Các phát hiện là manh mối cần kiểm chứng, không phải kết luận.",
      "Dữ liệu của bạn. Chỉ phân tích kho mà bạn được phép xem.",
    ],
    citations: "Cách đọc trích dẫn",
    citationText: "Mỗi trích dẫn gồm đường dẫn tệp, mã commit và phạm vi dòng. #L12-L18 đánh dấu từ dòng 12 đến dòng 18. Bấm vào để mở đúng phiên bản trên GitHub, kể cả khi nhánh đã có thay đổi mới.",
    citationExample: "src/app.py · a1b2c3d · #L12-L18",
    evidence: "Nếu mã đã lập chỉ mục chưa cung cấp đủ bằng chứng, câu trả lời sẽ báo chưa thể kiểm chứng.",
    limitsTitle: "Phạm vi hiện tại",
    limits: [
      "Kho GitHub công khai. Kho riêng tư nằm trong định hướng mở rộng.",
      "Python được phân tích bằng AST đầy đủ. JavaScript và TypeScript ở mức cơ bản.",
      "Tối đa 5.000 tệp mỗi kho, mỗi tệp không quá 256 KB.",
    ],
    disclaimer: "Archaeologist là nguyên mẫu hỗ trợ phân tích, không thay thế code review, kiểm thử bảo mật hay phán đoán của kỹ sư.",
  },
};

export default function AboutOverview() {
  const { locale, t } = useI18n();
  const copy = content[locale];
  return (
    <section id="about" className="wrap resource-page home-about" aria-labelledby="about-heading">
      <header className="resource-head">
        <h2 id="about-heading">{t.introHeading}</h2>
        <p>{t.aboutPurpose}</p>
      </header>

      <section aria-labelledby="about-features">
        <h3 id="about-features" className="block-title">{copy.featuresTitle}</h3>
        <div className="card-grid">
          {copy.features.map(({ icon, title, body }) => (
            <article key={title} className="info-card">
              <Icon name={icon} size={20}/>
              <h4>{title}</h4>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rs-section" aria-labelledby="about-flow">
        <h3 id="about-flow" className="block-title">{copy.flowTitle}</h3>
        <ol className="flow">
          {copy.flow.map(([title, body]) => <li key={title}><h4>{title}</h4><p>{body}</p></li>)}
        </ol>
      </section>

      <div className="resource-columns rs-section">
        <section className="about-body" aria-labelledby="about-arch">
          <section>
            <h3 id="about-arch">{copy.architecture}</h3>
            <dl className="about-architecture">
              {copy.components.map(([name, description]) => (
                <div key={name}><dt>{name}</dt><dd>{description}</dd></div>
              ))}
            </dl>
            <p className="chip-label">{copy.stackLabel}</p>
            <ul className="chip-row">{copy.stack.map(item => <li key={item} className="chip">{item}</li>)}</ul>
          </section>
        </section>
        <aside className="resource-aside">
          <Icon name="shield" size={24}/>
          <h3>{copy.principlesTitle}</h3>
          <ul className="tick-list">
            {copy.principles.map(item => <li key={item}><Icon name="check" size={16}/><span>{item}</span></li>)}
          </ul>
        </aside>
      </div>

      <div className="resource-columns even rs-section">
        <aside className="resource-aside">
          <Icon name="code" size={24}/>
          <h3>{copy.citations}</h3>
          <p>{copy.citationText}</p>
          <code className="cite-sample">{copy.citationExample}</code>
          <p>{copy.evidence}</p>
        </aside>
        <aside className="resource-aside">
          <Icon name="compass" size={24}/>
          <h3>{copy.limitsTitle}</h3>
          <ul className="tick-list">
            {copy.limits.map(item => <li key={item}><Icon name="check" size={16}/><span>{item}</span></li>)}
          </ul>
          <p className="fine-print">{copy.disclaimer}</p>
          <Link href="/guide" className="text-action resource-link">{t.guideTitle}<Icon name="arrow" size={15}/></Link>
        </aside>
      </div>
    </section>
  );
}
