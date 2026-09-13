from pathlib import Path
import json,re
root=Path('/Users/kyungseok.lee/workspace-git/glintgrove')
for rel in ['src/main.js','src/ui/strings.js','manifest.webmanifest','tools/art-preview.html','tools/browser-e2e.html']:
 p=root/rel
 s=p.read_text().replace('Glintgrove','Ilyndrel').replace('GLINTGROVE','ILYNDREL')
 if rel=='src/main.js':
  s=s.replace('glintgrove-data-', 'ilyndrel-data-').replace('`✧ ${t(\'achievements\')}: ${name}`','`${t(\'achievements\')}: ${name}`').replace('`💡 ${t(`tip${def.id}`)}`','`${t(`tip${def.id}`)}`').replace('`☀️ ${dateStr}', '`${dateStr}').replace('`☀️ ${cfg.date}', '`${cfg.date}')
 p.write_text(s)
p=root/'package.json';d=json.loads(p.read_text());d['name']='ilyndrel';p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
p=root/'src/services/achievements.js';s=p.read_text();s=re.sub(r"id: '([^']+)', icon: '[^']+'",lambda m:f"id: '{m[1]}', icon: '{m[1]}'",s)
for old,new in {'첫 번째 빛':'첫 물방울','First Light':'First Droplet','새벽숲의 아침':'물방울을 잇다','Dawn of the Woods':'Droplets Connected','안개를 가른 빛':'갈림길의 해답','Through the Mist':'Both Paths Found','별빛 정원사':'세 가지 물빛','Starlight Gardener':'Three Tints','심장의 목격자':'맞은편의 불빛','Heart Witness':'Across the Pool','숲의 현자':'스스로 찾은 길','Forest Sage':'A Path of Your Own','오늘의 숲':'하루의 작은 발견',"Today\'s Forest":'One Daily Discovery','3일 연속 새벽':'세 날의 기록','Three Dawns':'Three Days Together','완벽한 새벽':'모든 물길의 빛','Perfect Dawn':'Every Channel Alight'}.items():s=s.replace(old,new)
p.write_text(s)
p=root/'src/services/tutorial.js';s=p.read_text().replace("art: '◇'", "art: 'splitter'").replace("art: '◈Ⓐ'", "art: 'crystal'").replace("art: '◎'", "art: 'portal'")
p.write_text(s)
p=root/'src/ui/strings.js';s=p.read_text()
for old,new in {
 '숲을 위한 야상곡':'물빛을 잇는 정원','A woodland nocturne':'A garden of reflected light',
 '빛으로 쓰는 숲의 이야기':'거울 사이로 이어지는 빛','A Light Reflection Puzzle':'A puzzle in reflected light',
 '300개의 작은 발견 · 하나의 살아 있는 숲':'300개의 물길 · 손끝에서 피어나는 정원','300 quiet discoveries · One living forest':'300 winding paths · A garden unfolds',
 '작은 빛 하나가 숲을 새벽에 한 걸음 더 가까이 데려갑니다.':'거울을 이어 물빛을 보내고, 길 끝의 작은 생명을 깨워보세요.',
 'Every small light brings the forest closer to dawn.':'Carry a glimmer around each bend and bring the garden into bloom.',
 '빛을 잃은 숲을 깨워주세요':'거울 너머, 작은 정원이 피어납니다','Wake the forest that lost its light':'Let a little garden unfold, one reflection at a time',
 '거울을 돌려, 잠든 숲에 빛을 전하세요':'거울 한 번, 새로운 물길 하나','Turn a mirror. Follow a glimmer. Wake a world.':'A turn of glass. A new path through the garden.',
 '숲이 깨어났습니다':'빛이 길 끝에 닿았습니다','The forest has awakened':'The light has found its way',
 '오늘의 숲이 깨어났습니다':'오늘의 물길을 이었습니다',"Today\'s forest has awakened":'Today\'s path is complete',
 '숲은 당신의 빛을 기다려요':'첫 물길을 열어보세요','The forest is waiting for your light':'Open the first path',
 '고대 빛 발산원이 다시 깨어났지만, 빛은 숲 깊은 곳까지 닿지 않습니다.':'정원 입구에서 작은 빛이 흐릅니다. 길을 이어 모든 나무와 생명에게 전해주세요.',
 'The ancient beacons have reawakened, but their light no longer reaches deep into the woods.':'A little light gathers at the garden entrance. Make a route that reaches every waiting plant and creature.',
 '거울과 분할기를 클릭해 회전시켜 빛의 길을 만들고, 나무·꽃·버섯·올빼미를 깨워주세요.':'거울을 누르면 방향이 바뀝니다. 분할기는 빛을 둘로 나누므로, 갈라진 길에도 빛을 보낼 수 있어요.',
 'Rotate mirrors and splitters to build a path of light, and wake the trees, flowers, mushrooms and owls.':'Tap a mirror to turn its reflection. A splitter sends light along two paths, so one source can reach several places.',
 '분할기(◇)':'분할기',
}.items():s=s.replace(old,new)
# Every remade level supplies nameEn; remove old catalogue fallback prose.
s=re.sub(r'export const LEVEL_NAMES_EN = \{[\s\S]*?\n\};', 'export const LEVEL_NAMES_EN = Object.freeze({});', s)
p.write_text(s)
