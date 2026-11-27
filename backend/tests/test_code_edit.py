import subprocess
import pytest
import httpx
from app.code_edit import prepare_edit
from app.llm import provider_error


def test_patch_applies_to_real_file(tmp_path):
    source = 'def f():\n    return 1\n'
    result = prepare_edit('app.py', source, 2, 2, '    return 2')
    (tmp_path/'app.py').write_text(source)
    patch = tmp_path/'change.patch'; patch.write_text(result['patch'])
    subprocess.run(['git','apply','--check',str(patch)], cwd=tmp_path, check=True)
    subprocess.run(['git','apply',str(patch)], cwd=tmp_path, check=True)
    assert (tmp_path/'app.py').read_text() == result['content'] == 'def f():\n    return 2\n'

@pytest.mark.parametrize('path,start,end,replacement',[('../a.py',1,1,'x'),('a.py',0,1,'x'),('a.py',1,4,'x'),('a.py',1,1,'def ('),('a.py',1,1,'x=1')])
def test_invalid_edit(path,start,end,replacement):
    with pytest.raises(ValueError): prepare_edit(path,'x=1\n',start,end,replacement)


def test_no_final_newline(tmp_path):
    (tmp_path/'a.txt').write_text('one\ntwo')
    result=prepare_edit('a.txt','one\ntwo',2,2,'three')
    patch=tmp_path/'p.diff'; patch.write_text(result['patch'])
    subprocess.run(['git','apply','--check',str(patch)],cwd=tmp_path,check=True)
    subprocess.run(['git','apply',str(patch)],cwd=tmp_path,check=True)
    assert (tmp_path/'a.txt').read_text()=='one\nthree'


def test_safe_http_diagnostic():
    req=httpx.Request('POST','https://example.com/?key=SECRET')
    err=httpx.HTTPStatusError('SECRET',request=req,response=httpx.Response(429,request=req))
    assert '429' in provider_error(err) and 'SECRET' not in provider_error(err)
