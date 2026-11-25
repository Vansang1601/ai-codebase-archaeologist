"use client";

import Link from "next/link";
import { useI18n } from "../../lib/i18n";
import Icon from "../components/Icon";

const content = {
  en: {
    architecture: "How Archaeologist works",
    components: [
      ["Next.js interface", "You submit a public GitHub URL and explore the files and results in your browser."],
      ["FastAPI and PostgreSQL", "The API validates the URL and queues an analysis job in PostgreSQL. It reads the saved results when you open the workspace."],
      ["Analysis worker", "The worker fetches the repository, records its commit SHA and indexes files, symbols and dependencies for that version."],
    ],
    features: "What you can explore",
    citations: "How to read a source citation",
    citationText: "Each citation includes a file path, a commit SHA and a line range. For example, #L12-L18 highlights lines 12 through 18. Opening the link takes you to that exact revision, even after the branch changes.",
    evidence: "When the indexed code provides too little evidence, the answer indicates that it could not be verified.",
  },
  vi: {
    architecture: "Kiến trúc hệ thống",
    components: [
      ["Giao diện Next.js", "Bạn nhập đường dẫn kho GitHub công khai và đọc mã nguồn, kết quả phân tích ngay trên trình duyệt."],
      ["API FastAPI và PostgreSQL", "API kiểm tra đường dẫn rồi thêm tác vụ phân tích vào hàng đợi trong PostgreSQL. Khi bạn mở kho, API đọc lại kết quả đã lưu."],
      ["Bộ xử lý phân tích", "Bộ xử lý tải kho, ghi lại mã định danh của commit (SHA) rồi lập chỉ mục các tệp, hàm và quan hệ phụ thuộc của phiên bản đó."],
    ],
    features: "Các tính năng phân tích",
    citations: "Cách đọc trích dẫn dòng mã",
    citationText: "Mỗi trích dẫn gồm đường dẫn tệp, mã commit và phạm vi dòng. Ví dụ, #L12-L18 đánh dấu từ dòng 12 đến dòng 18. Bấm vào trích dẫn để mở đúng phiên bản trên GitHub, kể cả khi nhánh đã có thay đổi mới.",
    evidence: "Nếu mã nguồn đã lập chỉ mục chưa cung cấp đủ bằng chứng, phần hỏi đáp sẽ báo chưa đủ cơ sở để trả lời.",
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
      <div className="resource-columns">
        <div className="about-body">
          <section>
            <h3>{copy.architecture}</h3>
            <dl className="about-architecture">
              {copy.components.map(([name, description]) => (
                <div key={name}><dt>{name}</dt><dd>{description}</dd></div>
              ))}
            </dl>
          </section>
          <section>
            <h3>{copy.features}</h3>
            <p>{t.aboutDetails}</p>
            <Link href="/guide" className="text-action resource-link">{t.guideTitle}<Icon name="arrow" size={15}/></Link>
          </section>
        </div>
        <aside className="resource-aside">
          <Icon name="code" size={24}/>
          <h3>{copy.citations}</h3>
          <p>{copy.citationText}</p>
          <p>{copy.evidence}</p>
        </aside>
      </div>
    </section>
  );
}
