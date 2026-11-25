"use client";

import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import Icon from "../components/Icon";

const content = {
  en: {
    intro: "Follow a public GitHub repository from its URL to the lines of code behind a result.",
    stepsTitle: "Your first analysis",
    steps: [
      ["Choose a repository", "On the home page, paste its GitHub URL or choose pallets/click to try an example. Sign in first if you want to revisit the analysis from your library."],
      ["Start the analysis", "Select Analyze. The workspace shows progress while the repository is downloaded and indexed at a specific commit."],
      ["Read the results", "Open Source Code to read a file, Timeline to browse commits, or Dependencies to see which files a change could affect."],
      ["Check an answer", "Open the chat and ask where a function is used. Follow a source citation to inspect the referenced lines on GitHub."],
    ],
    benefitsTitle: "What you can use it for",
    benefits: [
      ["Learn a new project", "Find the files and functions behind a feature before making your first change."],
      ["Plan a change", "Follow dependencies to identify related files for review."],
      ["Share evidence", "Use a link to a specific commit and line range when explaining a finding to your team."],
    ],
    action: "Analyze a repository",
  },
  vi: {
    intro: "Từ một đường dẫn GitHub, bạn có thể lần theo kết quả phân tích đến đúng dòng mã của phiên bản đang xem.",
    stepsTitle: "Phân tích kho mã đầu tiên",
    steps: [
      ["Chọn kho mã", "Ở Trang chủ, dán đường dẫn kho GitHub công khai hoặc chọn ví dụ pallets/click. Nếu muốn xem lại kết quả trong Thư viện, hãy đăng nhập trước khi phân tích."],
      ["Bắt đầu phân tích", "Nhấn Phân tích. Trang kết quả sẽ hiển thị tiến độ tải kho và lập chỉ mục mã nguồn tại một commit cụ thể."],
      ["Đọc kết quả", "Mở Mã nguồn để đọc tệp, Lịch sử để xem commit, hoặc Phụ thuộc để tìm các tệp có thể chịu ảnh hưởng khi sửa mã."],
      ["Kiểm tra câu trả lời", "Mở khung trò chuyện và hỏi một hàm được dùng ở đâu. Nhấn vào trích dẫn để đọc đúng đoạn mã trên GitHub."],
    ],
    benefitsTitle: "Lợi ích khi sử dụng",
    benefits: [
      ["Làm quen với dự án mới", "Tìm tệp và hàm phụ trách một tính năng trước khi bắt đầu sửa mã."],
      ["Chuẩn bị cho một thay đổi", "Lần theo các phụ thuộc để biết nên kiểm tra thêm những tệp nào."],
      ["Trao đổi có dẫn chứng", "Gửi cho đồng đội liên kết tới đúng commit và dòng mã khi giải thích một phát hiện."],
    ],
    action: "Phân tích một kho mã",
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
        <h2>{copy.benefitsTitle}</h2>
        <dl>{copy.benefits.map(([title, body]) => <div key={title}><dt>{title}</dt><dd>{body}</dd></div>)}</dl>
      </aside>
    </div>
  </article>;
}
