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
    intro: "From a GitHub URL to the exact lines of code behind a result, in four steps.",
    stepsTitle: "Your first analysis",
    steps: [
      ["Choose a repository", "On the home page, paste a public GitHub URL such as https://github.com/pallets/click, or pick an example. Sign in first if you want the analysis saved in your library."],
      ["Start the analysis", "Select Analyze. The workspace shows each phase while the repository is downloaded, parsed and indexed at one specific commit."],
      ["Read the results", "Switch between the tabs to read code, browse history, follow dependencies and review findings."],
      ["Check an answer", "Open the chat button and ask a question. Follow any citation to read the referenced lines on GitHub."],
    ],
    action: "Analyze a repository",
    beforeTitle: "Before you start",
    before: [
      ["You need", "A public GitHub repository URL in the form https://github.com/owner/repo."],
      ["Signing in", "Optional. It lets you reopen your repositories from the Library."],
      ["Progress", "The job moves through queued, cloning, scanning, parsing, indexing, history, Pull Requests and technical debt. Larger repositories take longer."],
    ],
    areasTitle: "Tour of the results page",
    areasLead: "Each tab answers a different question about the same commit.",
    areas: [
      { icon: "overview", title: "Overview", body: "Totals for files, symbols, dependencies, indexed chunks and Pull Requests, plus the branch and the commit SHA that was analyzed." },
      { icon: "file", title: "Source Code", body: "Filter files by path, select one and read it with line numbers. Start here to confirm what a citation refers to." },
      { icon: "clock", title: "Timeline", body: "The most recent commits collected for the repository, with author and date. Use it to see when and why an area changed." },
      { icon: "graph", title: "Dependencies", body: "Enter a file path and choose the impact check. It lists files that depend on it, up to two steps away, next to the resolved internal imports." },
      { icon: "audit", title: "Technical Debt", body: "Findings for large files and functions, high coupling and dependency cycles. Each one lists its evidence so you can verify it." },
      { icon: "branch", title: "Pull Requests", body: "Pull Request metadata from GitHub, including state and dates, to connect changes with the discussion behind them." },
    ],
    askTitle: "Ask better questions",
    askLead: "The chat answers from the code indexed in this snapshot, so specific questions work best.",
    askTips: [
      "Name a file, function or feature instead of asking in general terms.",
      "Ask one thing at a time. Follow-up questions keep the recent context.",
      "Open the citations to confirm the answer before you rely on it.",
    ],
    promptsLabel: "Try asking",
    prompts: [
      "What is the overall architecture?",
      "Where is the application entrypoint?",
      "How is authentication handled?",
      "Which files import config.py?",
    ],
    readTitle: "Reading an answer",
    read: [
      ["Grounded Evidence", "The answer is backed by retrieved code. Each source shows its file, lines and commit."],
      ["Insufficient Evidence", "Nothing in the index matched well enough. Rephrase with a file or function name, or accept that the repository may not contain the answer."],
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      ["Can I analyze a private repository?", "Not yet. This version works with public GitHub repositories. Private access through a GitHub App is planned."],
      ["Which languages are supported?", "Python is parsed with a full AST. JavaScript and TypeScript are supported at a basic level. Other languages are still indexed as text for search, but have fewer symbols and dependencies."],
      ["Why does the answer say there is insufficient evidence?", "The system answers only when the retrieved code supports it. Try a more specific question, or check that the file exists in the snapshot."],
      ["Why are some files missing?", "Binaries, build output, vendored folders, secrets and files over 256 KB are skipped on purpose. A repository is also limited to 5,000 files."],
      ["Is every finding a real problem?", "No. Findings are rule-based signals and can be false positives. Treat them as leads and confirm them in the code."],
      ["The analysis failed. What now?", "Select Re-analyze. If it fails again, contact support with the repository URL and the message you saw."],
    ],
    support: "Need more help? Contact support",
  },
  vi: {
    intro: "Từ một đường dẫn GitHub đến đúng dòng mã đứng sau mỗi kết quả, chỉ trong bốn bước.",
    stepsTitle: "Phân tích kho mã đầu tiên",
    steps: [
      ["Chọn kho mã", "Ở Trang chủ, dán đường dẫn kho GitHub công khai, ví dụ https://github.com/pallets/click, hoặc chọn một ví dụ. Hãy đăng nhập trước nếu muốn lưu kết quả vào Thư viện."],
      ["Bắt đầu phân tích", "Nhấn Phân tích. Trang kết quả hiển thị từng giai đoạn khi kho được tải, phân tích và lập chỉ mục tại một commit cụ thể."],
      ["Đọc kết quả", "Chuyển giữa các thẻ để đọc mã, xem lịch sử, lần theo phụ thuộc và xem các phát hiện."],
      ["Kiểm tra câu trả lời", "Mở nút trò chuyện và đặt câu hỏi. Bấm vào trích dẫn để đọc đúng các dòng mã trên GitHub."],
    ],
    action: "Phân tích một kho mã",
    beforeTitle: "Trước khi bắt đầu",
    before: [
      ["Bạn cần", "Đường dẫn kho GitHub công khai có dạng https://github.com/owner/repo."],
      ["Đăng nhập", "Không bắt buộc. Đăng nhập để mở lại các kho đã phân tích trong Thư viện."],
      ["Tiến độ", "Tác vụ đi qua các bước: chờ, tải kho, đọc tệp, phân tích mã, lập chỉ mục, đọc lịch sử, thu thập Pull Request và kiểm tra nợ kỹ thuật. Kho càng lớn càng lâu."],
    ],
    areasTitle: "Làm quen với trang kết quả",
    areasLead: "Mỗi thẻ trả lời một câu hỏi khác nhau về cùng một commit.",
    areas: [
      { icon: "overview", title: "Tổng quan", body: "Số lượng tệp, hàm/lớp, phụ thuộc, đoạn đã lập chỉ mục và Pull Request, cùng nhánh và mã commit đã phân tích." },
      { icon: "file", title: "Mã nguồn", body: "Lọc tệp theo đường dẫn, chọn một tệp và đọc kèm số dòng. Hãy bắt đầu từ đây để kiểm tra một trích dẫn trỏ tới đâu." },
      { icon: "clock", title: "Lịch sử", body: "Các commit gần nhất của kho, kèm tác giả và ngày. Dùng để biết một phần mã đã thay đổi khi nào và vì sao." },
      { icon: "graph", title: "Phụ thuộc", body: "Nhập đường dẫn một tệp rồi bấm kiểm tra ảnh hưởng. Danh sách gồm các tệp phụ thuộc vào nó, tối đa hai bước, cùng các import nội bộ đã xác định." },
      { icon: "audit", title: "Nợ kỹ thuật", body: "Phát hiện tệp và hàm quá lớn, phụ thuộc quá nhiều, vòng phụ thuộc. Mỗi mục kèm bằng chứng để bạn tự kiểm chứng." },
      { icon: "branch", title: "Pull Requests", body: "Thông tin Pull Request lấy từ GitHub, gồm trạng thái và ngày tháng, để nối thay đổi với thảo luận phía sau." },
    ],
    askTitle: "Đặt câu hỏi hiệu quả",
    askLead: "Khung trò chuyện trả lời dựa trên mã đã lập chỉ mục của phiên bản này, nên câu hỏi càng cụ thể càng tốt.",
    askTips: [
      "Nêu tên tệp, hàm hoặc tính năng thay vì hỏi chung chung.",
      "Mỗi lần hỏi một ý. Câu hỏi tiếp theo vẫn giữ ngữ cảnh gần nhất.",
      "Mở trích dẫn để kiểm tra trước khi dựa vào câu trả lời.",
    ],
    promptsLabel: "Thử hỏi",
    prompts: [
      "Kiến trúc tổng thể và module chính?",
      "Điểm bắt đầu của ứng dụng ở đâu?",
      "Xử lý xác thực người dùng thế nào?",
      "Những tệp nào import config.py?",
    ],
    readTitle: "Cách đọc câu trả lời",
    read: [
      ["Đã đối chiếu mã nguồn", "Câu trả lời dựa trên đoạn mã đã truy xuất. Mỗi nguồn hiển thị tệp, dòng và commit."],
      ["Thiếu bằng chứng tin cậy", "Không có nội dung nào trong chỉ mục khớp đủ tốt. Hãy hỏi lại kèm tên tệp hoặc hàm, hoặc chấp nhận rằng kho có thể không chứa câu trả lời."],
    ],
    faqTitle: "Câu hỏi thường gặp",
    faq: [
      ["Tôi có phân tích được kho riêng tư không?", "Chưa. Phiên bản này làm việc với kho GitHub công khai. Truy cập kho riêng tư qua GitHub App nằm trong định hướng mở rộng."],
      ["Hỗ trợ những ngôn ngữ nào?", "Python được phân tích bằng AST đầy đủ. JavaScript và TypeScript ở mức cơ bản. Ngôn ngữ khác vẫn được lập chỉ mục dạng văn bản để tìm kiếm, nhưng có ít hàm và phụ thuộc hơn."],
      ["Vì sao câu trả lời báo thiếu bằng chứng?", "Hệ thống chỉ trả lời khi mã truy xuất được ủng hộ câu trả lời. Hãy hỏi cụ thể hơn, hoặc kiểm tra tệp đó có trong phiên bản này không."],
      ["Vì sao một số tệp không xuất hiện?", "Tệp nhị phân, thư mục build, mã vendor, tệp bí mật và tệp trên 256 KB bị bỏ qua có chủ đích. Mỗi kho cũng giới hạn 5.000 tệp."],
      ["Mọi phát hiện đều là lỗi thật?", "Không. Phát hiện dựa trên quy tắc nên có thể sai. Hãy xem đó là manh mối và kiểm tra lại trong mã."],
      ["Phân tích bị lỗi thì làm gì?", "Nhấn Phân tích lại. Nếu vẫn lỗi, hãy liên hệ hỗ trợ kèm đường dẫn kho và thông báo bạn thấy."],
    ],
    support: "Cần thêm trợ giúp? Liên hệ hỗ trợ",
  },
};

export default function GuidePage() {
  const { locale, t } = useI18n();
  const copy = content[locale];
  return <article className="wrap resource-page">
    <header className="resource-head"><h1>{t.guideTitle}</h1><p>{copy.intro}</p></header>

    <div className="resource-columns">
      <section className="guide-instructions">
        <h2>{copy.stepsTitle}</h2>
        <ol className="guide-steps">{copy.steps.map(([title, body]) =>
          <li key={title}><h3>{title}</h3><p>{body}</p></li>
        )}</ol>
        <Link className="primary resource-link" href="/#analyze">{copy.action}<Icon name="arrow" size={16}/></Link>
      </section>
      <aside className="resource-aside">
        <Icon name="compass" size={24}/>
        <h2>{copy.beforeTitle}</h2>
        <dl>{copy.before.map(([title, body]) => <div key={title}><dt>{title}</dt><dd>{body}</dd></div>)}</dl>
      </aside>
    </div>

    <section className="rs-section" aria-labelledby="guide-areas">
      <h2 id="guide-areas">{copy.areasTitle}</h2>
      <p className="rs-lead">{copy.areasLead}</p>
      <div className="card-grid">
        {copy.areas.map(({ icon, title, body }) => (
          <article key={title} className="info-card">
            <Icon name={icon} size={20}/>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>

    <div className="resource-columns even rs-section">
      <section className="guide-instructions" aria-labelledby="guide-ask">
        <h2 id="guide-ask">{copy.askTitle}</h2>
        <p className="rs-lead">{copy.askLead}</p>
        <ul className="tick-list">
          {copy.askTips.map(tip => <li key={tip}><Icon name="check" size={16}/><span>{tip}</span></li>)}
        </ul>
        <p className="chip-label">{copy.promptsLabel}</p>
        <ul className="prompt-list">{copy.prompts.map(p => <li key={p}>{p}</li>)}</ul>
      </section>
      <aside className="resource-aside">
        <Icon name="quote" size={24}/>
        <h2>{copy.readTitle}</h2>
        <dl>{copy.read.map(([title, body], i) =>
          <div key={title}><dt><span className={"dot " + (i === 0 ? "ok" : "warn")}/>{title}</dt><dd>{body}</dd></div>
        )}</dl>
      </aside>
    </div>

    <section className="rs-section" aria-labelledby="guide-faq">
      <h2 id="guide-faq">{copy.faqTitle}</h2>
      <div className="faq">
        {copy.faq.map(([question, answer]) => (
          <details key={question}><summary>{question}</summary><p>{answer}</p></details>
        ))}
      </div>
      <Link className="text-action resource-link" href="/support">{copy.support}<Icon name="arrow" size={15}/></Link>
    </section>
  </article>;
}
