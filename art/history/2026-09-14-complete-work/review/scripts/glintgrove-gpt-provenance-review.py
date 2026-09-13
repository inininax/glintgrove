import hashlib, json, os, pathlib, shutil, subprocess, tempfile
ROOT=pathlib.Path('/Users/kyungseok.lee/workspace-git/glintgrove')
RECORD='docs/legal/replacement-register.json'
TOOL='tools/record-visual-provenance.mjs'

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
real_hash_before=sha(ROOT/RECORD)
results=[]
with tempfile.TemporaryDirectory(prefix='glintgrove-gpt-provenance-review-') as tmp:
    fixture=pathlib.Path(tmp)
    for top in ['art','assets','css','docs','src','tools']:
        for folder, dirs, files in os.walk(ROOT/top):
            dirs[:]=[d for d in dirs if d not in ['__pycache__','.venv-art-build','build','retired']]
            for filename in files:
                original=pathlib.Path(folder)/filename
                relative=original.relative_to(ROOT)
                target=fixture/relative
                target.parent.mkdir(parents=True,exist_ok=True)
                if str(relative)==RECORD: continue
                if str(relative)==TOOL: shutil.copy2(original,target)
                else: target.symlink_to(original)
    for name in ['index.html','manifest.webmanifest','sw.js','package.json']:
        (fixture/name).symlink_to(ROOT/name)
    def invoke(label, expected):
        run=subprocess.run(['node',str(fixture/TOOL)],capture_output=True,text=True)
        assert run.returncode==0,(label,run.stderr)
        record=json.loads((fixture/RECORD).read_text())
        forest=next(a for a in record['assets'] if a['id']=='forest')
        assert forest['provenanceStatus']==expected,(label,forest)
        assert forest['generationEvidence']=='art/recipes/gpt-forest-v4.json'
        assert 'master' not in forest, 'GPT output incorrectly marked a Blender master'
        assert record['copyrightClearance']=='not-established'
        results.append({'case':label,'status':forest['provenanceStatus'],'production':forest['production']})
    invoke('unchanged-records','verified-against-recorded-image-generation-inputs')
    for path in ['art/source/gpt/forest-v4.png','art/recipes/gpt-forest-v4.prompt.txt','art/source/procedural/forest-v3.png','art/source/procedural/nocturne-environments-v3.blend','art/source/procedural/nocturne-environments-v2.blend']:
        item=fixture/path
        item.unlink()
        item.write_bytes((ROOT/path).read_bytes()+b'\nfixture-drift\n')
        invoke('modified:'+path,'renewed-provenance-review-required')
        item.unlink()
        item.symlink_to(ROOT/path)
    for path in ['art/source/procedural/forest-v3.png']:
        item=fixture/path
        item.unlink()
        invoke('missing:'+path,'renewed-provenance-review-required')
        item.symlink_to(ROOT/path)
    prompt=fixture/'art/recipes/gpt-forest-v4.prompt.txt'
    prompt.unlink()
    run=subprocess.run(['node',str(fixture/TOOL)],capture_output=True,text=True)
    assert run.returncode!=0 and 'ENOENT' in run.stderr, 'Missing required recipe must fail closed'
    results.append({'case':'missing-required-prompt','status':'fails-closed-with-ENOENT'})
assert sha(ROOT/RECORD)==real_hash_before,'Real register unexpectedly changed during fixture-only run'
print(json.dumps({'passed':len(results),'cases':results,'realRegistryUntouched':True},indent=2))
