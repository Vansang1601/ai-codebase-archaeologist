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
      ["Check an answer", "Open the chat button and ask a question. Select a citation to highlight its lines in the explorer, or use the GitHub link beside it."],
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
      ["Can I analyze a private repository?", "Not yet. This version works only with public GitHub repositories, because the worker clones them without any credentials. Private access through a GitHub App is planned. Until then, you can fork or mirror the code into a public repository you are allowed to share, but never publish code that is confidential."],
      ["Which languages are supported?", "Python is parsed with a full AST, so functions, classes and imports are extracted accurately. JavaScript and TypeScript are supported at a basic level: you get symbols and the main import relations. Other languages are still indexed as plain text, so you can search and ask about them, but they have fewer symbols and no dependency graph."],
      ["Why does the answer say there is insufficient evidence?", "The system answers only when the retrieved code actually supports the answer, and it would rather say so than guess. This usually means the question is too general, the topic lives in a file that was skipped, or the repository simply does not contain it. Name a file, function or feature, check that the file exists in the Source Code tab, and ask again."],
      ["How do I read and trust a citation?", "Each citation combines a file path, a short commit SHA and a line range such as #L12-L18. Select it to highlight those lines in the Source Code tab, or open the GitHub link beside it to read the same revision online. Always open at least one citation before you rely on an answer, because the answer is only as good as the lines it points to."],
      ["Why are some files missing?", "Some files are skipped on purpose to keep the analysis safe and fast: binaries, build output, vendored or generated folders, secrets and any file larger than 256 KB. A repository is also limited to 5,000 files. If an important file is missing, check whether it falls under one of these rules."],
      ["Is every finding in Technical Debt a real problem?", "No. Findings come from fixed rules, such as very large files or functions, heavy coupling and circular dependencies, so some are false positives. Treat each one as a lead: open its evidence, read the code and decide with your team whether it needs action. The tool suggests, it does not judge."],
      ["Why do I not see my repository in the Library?", "The Library lists repositories analyzed while you were signed in. If you analyzed one before signing in, sign in and analyze it again. If it is already indexed at the same commit, the saved results are reused and it appears right away."],
      ["The analysis is slow or failed. What should I do?", "Large repositories take longer, and the page shows the current phase and progress. If a job fails or seems stuck, select Re-analyze. If it fails again, scroll to the Support section at the bottom of the home page and send us the repository URL, the commit SHA if shown, and the exact message you saw."],
      ["Does Archaeologist run or change my code?", "No. The repository is cloned and read only. Its code is parsed as text and is never executed or modified, and nothing is written back to GitHub."],
    ],
    support: "Need more help? Go to Support",
  },
  vi: {
    intro: "Từ một đường dẫn GitHub đến đúng dòng mã đứng sau mỗi kết quả, chỉ trong bốn bước.",
    stepsTitle: "Phân tích kho mã đầu tiên",
    steps: [
      ["Chọn kho mã", "Ở Trang chủ, dán đường dẫn kho GitHub công khai, ví dụ https://github.com/pallets/click, hoặc chọn một ví dụ. Hãy đăng nhập trước nếu muốn lưu kết quả vào Thư viện."],
      ["Bắt đầu phân tích", "Nhấn Phân tích. Trang kết quả hiển thị từng giai đoạn khi kho được tải, phân tích và lập chỉ mục tại một commit cụ thể."],
      ["Đọc kết quả", "Chuyển giữa các thẻ để đọc mã, xem lịch sử, lần theo phụ thuộc và xem các phát hiện."],
      ["Kiểm tra câu trả lời", "Mở nút trò chuyện và đặt câu hỏi. Chọn trích dẫn để tô sáng đúng dòng mã trong trình duyệt tệp, hoặc mở liên kết GitHub bên cạnh."],
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
      ["Tôi có phân tích được kho riêng tư không?", "Chưa. Phiên bản này chỉ làm việc với kho GitHub công khai, vì bộ xử lý tải kho mà không dùng thông tin đăng nhập nào. Truy cập kho riêng tư qua GitHub App nằm trong định hướng mở rộng. Trong lúc chờ, bạn có thể fork hoặc sao chép mã sang một kho công khai mà bạn được phép chia sẻ, nhưng tuyệt đối không công khai mã nguồn mang tính bảo mật."],
      ["Hỗ trợ những ngôn ngữ nào?", "Python được phân tích bằng AST đầy đủ nên hàm, lớp và import được trích xuất chính xác. JavaScript và TypeScript ở mức cơ bản: có danh sách hàm/lớp và các quan hệ import chính. Ngôn ngữ khác vẫn được lập chỉ mục dạng văn bản nên bạn có thể tìm kiếm và hỏi đáp, nhưng có ít hàm hơn và không có đồ thị phụ thuộc."],
      ["Vì sao câu trả lời báo thiếu bằng chứng?", "Hệ thống chỉ trả lời khi đoạn mã truy xuất được thật sự ủng hộ câu trả lời, và thà báo thiếu còn hơn đoán bừa. Thường là do câu hỏi quá chung chung, nội dung nằm trong tệp đã bị bỏ qua, hoặc kho mã vốn không chứa nó. Hãy nêu tên tệp, hàm hoặc tính năng, kiểm tra tệp có trong thẻ Mã nguồn không rồi hỏi lại."],
      ["Làm sao đọc và kiểm chứng một trích dẫn?", "Mỗi trích dẫn gồm đường dẫn tệp, mã commit rút gọn và phạm vi dòng như #L12-L18. Chọn trích dẫn để tô sáng các dòng đó trong thẻ Mã nguồn, hoặc mở liên kết GitHub bên cạnh để đọc đúng phiên bản trên mạng. Hãy mở ít nhất một trích dẫn trước khi tin vào câu trả lời, vì câu trả lời chỉ đáng tin bằng chính những dòng mã mà nó chỉ tới."],
      ["Vì sao một số tệp không xuất hiện?", "Một số tệp bị bỏ qua có chủ đích để việc phân tích an toàn và nhanh: tệp nhị phân, thư mục build, mã vendor hoặc mã sinh tự động, tệp bí mật và mọi tệp lớn hơn 256 KB. Mỗi kho cũng giới hạn 5.000 tệp. Nếu thiếu một tệp quan trọng, hãy kiểm tra xem nó có thuộc các quy tắc trên không."],
      ["Mọi phát hiện trong Nợ kỹ thuật đều là lỗi thật?", "Không. Phát hiện dựa trên quy tắc cố định như tệp hoặc hàm quá lớn, phụ thuộc quá nhiều, vòng phụ thuộc, nên một số có thể là báo nhầm. Hãy xem mỗi mục là một manh mối: mở bằng chứng kèm theo, đọc mã rồi cùng nhóm quyết định có cần xử lý hay không. Công cụ chỉ gợi ý, không phán xét."],
      ["Vì sao tôi không thấy kho của mình trong Thư viện?", "Thư viện chỉ liệt kê các kho được phân tích khi bạn đã đăng nhập. Nếu bạn phân tích trước khi đăng nhập, hãy đăng nhập rồi phân tích lại. Nếu commit đó đã được lập chỉ mục, kết quả đã lưu sẽ được dùng lại và kho xuất hiện ngay."],
      ["Phân tích chậm hoặc bị lỗi thì làm gì?", "Kho lớn cần nhiều thời gian hơn, trang kết quả hiển thị giai đoạn và tiến độ hiện tại. Nếu tác vụ lỗi hoặc có vẻ bị treo, hãy nhấn Phân tích lại. Nếu vẫn lỗi, kéo xuống phần Hỗ trợ ở cuối Trang chủ và gửi cho nhóm đường dẫn kho, mã commit nếu có và nguyên văn thông báo bạn thấy."],
      ["Archaeologist có chạy hay sửa mã của tôi không?", "Không. Kho chỉ được tải về và đọc. Mã được phân tích dưới dạng văn bản, không bao giờ bị chạy hay bị sửa, và không có gì được ghi ngược lại lên GitHub."],
    ],
    support: "Cần thêm trợ giúp? Xem phần Hỗ trợ",
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

    <section className="guide-example">
      <Icon name="repository" size={24}/><div><h2>{locale==="vi" ? "Thử lần theo một tệp" : "Trace a file in Click"}</h2>
      <p>{locale==="vi" ? "Phân tích " : "Analyze "}<code>pallets/click</code>{locale==="vi" ? ", mở bản đồ phụ thuộc rồi tìm " : ", open the dependency map and locate "}<code>src/click/core.py</code>{locale==="vi" ? ". Chọn tệp để xem các tệp phụ thuộc vào nó. Mở chat, hỏi về lớp Command rồi chọn trích dẫn để đọc mã ở đúng commit." : ". Select it to inspect its dependents. Ask the chat about the Command class, then open a citation to read its source at the indexed commit."}</p></div>
    </section>

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
      <Link className="text-action resource-link" href="/#support">{copy.support}<Icon name="arrow" size={15}/></Link>
    </section>
  </article>;
}
