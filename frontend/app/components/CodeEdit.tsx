"use client";
import { useState } from "react";
import { api, type FileDetail, type SourceLocation, type CodeEdit, type AskResult } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import Icon from "./Icon";
import { messageOf } from "./WorkspaceUI";

function save(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], {type: "text/plain;charset=utf-8"}));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function CodeEditPanel({id, file, location}: {id: string; file: FileDetail; location: SourceLocation}) {
  const {locale} = useI18n(); const vi = locale === "vi";
  const [start, setStart] = useState(location.line_start || 1);
  const [end, setEnd] = useState(location.line_end || location.line_start || 1);
  const [instruction, setInstruction] = useState("");
  const [manual, setManual] = useState(false);
  const [replacement, setReplacement] = useState("");
  const [result, setResult] = useState<CodeEdit | null>(null);
  const [inspection, setInspection] = useState<AskResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const lines = file.content.split(/\r?\n/); const count = lines.length - (file.content.endsWith("\n") ? 1 : 0);
  const valid = Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start && end <= count && end-start < 200;
  function reset() {setInspection(null);setResult(null); setApplied(false); setError("");}
  async function inspect() {
    if (!valid || busy) return; setBusy(true); reset();
    try {setInspection(await api.inspectSelection(id,{path:file.path,commit_sha:file.commit_sha,line_start:start,line_end:end,instruction:instruction.trim() || (vi?"Giải thích đoạn mã được chọn, chỉ ra rủi ro tiềm ẩn và cách kiểm tra.":"Explain the selected code, potential issues and how to verify them.")}));}
    catch(e){setError(messageOf(e,locale));}finally{setBusy(false);}
  }
  async function preview() {
    if (!valid || busy) return; setBusy(true); reset();
    try { setResult(await api.codeEdit(id, {path:file.path,commit_sha:file.commit_sha,line_start:start,line_end:end,...(manual ? {replacement} : {instruction})})); }
    catch(e) {setError(messageOf(e, locale));} finally {setBusy(false);}
  }
  return <section className="edit-studio">
    <div className="studio-heading"><Icon name="code" size={20}/><div><h3>{vi?"Xưởng sửa mã":"Code fix studio"}</h3><p className="muted">{vi?"Chọn dòng, đề xuất thay đổi và xem trước. Snapshot gốc không thay đổi.":"Select lines, propose changes and preview. Original snapshot remains unchanged."}</p></div></div>
    <div className="edit-range"><label>{vi?"Từ dòng":"Start line"}<input type="number" min={1} max={count} value={start} disabled={busy} onChange={e=>{const n=Number(e.target.value);setStart(n);if(manual)setReplacement(lines.slice(n-1,end).join("\n"));reset();}}/></label><label>{vi?"Đến dòng":"End line"}<input type="number" min={1} max={count} value={end} disabled={busy} onChange={e=>{const n=Number(e.target.value);setEnd(n);if(manual)setReplacement(lines.slice(start-1,n).join("\n"));reset();}}/></label></div>
    {valid && <pre className="edit-selection">{lines.slice(start-1,end).map((l,i)=>`${start+i}  ${l}`).join("\n")}</pre>}
    <div className="edit-actions"><button className="quiet small" disabled={busy} aria-pressed={!manual} onClick={()=>{setManual(false);reset();}}><Icon name="sparkles" size={15}/> AI</button><button className="quiet small" disabled={busy} aria-pressed={manual} onClick={()=>{setManual(true);setReplacement(lines.slice(start-1,end).join("\n"));reset();}}><Icon name="code" size={15}/>{vi?"Sửa thủ công":"Manual edit"}</button></div>
    {manual?<label>{vi?"Mã thay thế":"Replacement code"}<textarea className="edit-code" rows={6} value={replacement} disabled={busy} onChange={e=>{setReplacement(e.target.value);reset();}}/></label>:<label>{vi?"Yêu cầu AI sửa":"AI edit instruction"}<textarea rows={3} maxLength={2000} value={instruction} disabled={busy} onChange={e=>{setInstruction(e.target.value);reset();}} placeholder={vi?"Ví dụ: kiểm tra giá trị null trước khi truy cập":"e.g. Validate null before accessing a value"}/></label>}
    <div className="edit-actions"><button className="quiet" onClick={inspect} disabled={busy||!valid}><Icon name="inspect" size={16}/>{vi?"Soi đoạn mã đã chọn":"Inspect selected lines"}</button><button className="primary" onClick={preview} disabled={busy||!valid||(!manual&&!instruction.trim())}>{busy?(vi?"Đang xử lý…":"Working…"):(vi?"Xem trước thay đổi":"Preview changes")}</button></div>
    {inspection && <div className="edit-result"><h4>{vi?"Kết quả soi đoạn mã":"Selected code analysis"}</h4><code>{file.path} · L{start}–L{end}</code><p className="dossier-answer">{inspection.answer}</p>{inspection.warnings?.map((w,i)=><p key={i} className="notice caution">{w}</p>)}</div>}
    {error && <p role="alert" className="notice error">{error}</p>}
    {result && <div className="edit-result"><p className="notice">{result.validation==="python_ast"?(vi?"Đã kiểm tra cú pháp Python; chưa chạy test.":"Python syntax checked; tests not run."):(vi?"Đã kiểm tra phạm vi; chưa kiểm tra cú pháp hoặc chạy test.":"Range checked; syntax and tests not verified.")}</p><div className="edit-diff"><div><h4>{vi?"Trước":"Before"}</h4><pre className="diff-before">{result.before}</pre></div><div><h4>{vi?"Sau":"After"}</h4><pre className="diff-after">{result.after||"∅"}</pre></div></div><div className="edit-actions"><button className="primary" disabled={applied} onClick={()=>{if(window.confirm(vi?"Áp dụng vào bản nháp trong trình duyệt? Không thay đổi GitHub.":"Apply to browser draft? GitHub will not change."))setApplied(true);}}>{vi?"Áp dụng bản nháp":"Apply to draft"}</button><button className="quiet" onClick={()=>{setResult(null);setApplied(false);}}>{vi?"Hủy":"Discard"}</button></div>{applied&&<><p role="status">{vi?"Đã áp dụng vào bản nháp. Tải patch để kiểm tra bằng git apply --check trước khi áp dụng cục bộ.":"Applied to draft. Download patch and run git apply --check before applying locally."}</p><div className="edit-actions"><button className="quiet" onClick={()=>save("archaeologist.patch",result.patch)}>{vi?"Tải patch":"Download patch"}</button><button className="quiet" onClick={()=>save(file.path.split("/").pop()||"source.txt",result.content)}>{vi?"Tải tệp đã sửa":"Download edited file"}</button></div><details><summary>{vi?"Xem toàn bộ bản nháp":"View full draft"}</summary><pre className="edit-selection">{result.content}</pre></details></>}</div>}
  </section>;
}
