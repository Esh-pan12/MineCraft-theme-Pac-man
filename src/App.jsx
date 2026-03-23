import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const CELL = 28;
const COLS = 21;
const ROWS = 23;
const FPS = 7;

const WALL = 1, DOT = 2, POWER = 3, EATEN = 4, BREAKABLE = 5, LAVA = 6;

const DIR = { UP: [0,-1], DOWN: [0,1], LEFT: [-1,0], RIGHT: [1,0] };

const BASE_MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,0,0,0,0,1,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,0,0,0,1,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,0,0,0,0,0,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const BREAKABLE_POSITIONS = [[4,2],[16,2],[4,20],[16,20],[8,6],[12,6],[8,18],[12,18]];
const LAVA_POSITIONS      = [[3,10],[17,10],[10,4],[10,18]];
const TORCH_POSITIONS     = [[2,4],[18,4],[2,18],[18,18],[10,8],[10,14]];

const GHOST_COLORS = ["#FF4444","#FFB8FF","#FFB852","#00FFFF"];
const GHOST_NAMES  = ["Creeper","Skeleton","Spider","Enderman"];
const GHOST_HOME   = { x:10, y:10 };

const INGREDIENT_POSITIONS = [
  {x:3,y:1,type:"wood"},{x:17,y:1,type:"stone"},{x:1,y:11,type:"iron"},
  {x:19,y:11,type:"wood"},{x:5,y:19,type:"diamond"},{x:15,y:19,type:"stone"},
  {x:3,y:6,type:"iron"},{x:17,y:6,type:"wood"},{x:10,y:20,type:"diamond"},
];

const RECIPES = [
  { name:"Speed Boots",   ingredients:{wood:2,stone:1},    effect:"speed",        icon:"👟", duration:100 },
  { name:"Shield",        ingredients:{iron:2,stone:1},    effect:"shield",       icon:"🛡️", duration:80  },
  { name:"Super Pickaxe", ingredients:{diamond:1,iron:1},  effect:"superPickaxe", icon:"⛏️", duration:60  },
  { name:"Night Vision",  ingredients:{diamond:2},         effect:"nightVision",  icon:"👁️", duration:120 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cloneMaze() {
  const m = BASE_MAZE.map(r => [...r]);
  BREAKABLE_POSITIONS.forEach(([x,y]) => { if (m[y]?.[x] === WALL) m[y][x] = BREAKABLE; });
  LAVA_POSITIONS.forEach(([x,y])      => { if (m[y]?.[x] !== WALL) m[y][x] = LAVA; });
  return m;
}
function countDots(maze) { return maze.flat().filter(c => c===DOT||c===POWER).length; }
function isWalkable(maze, x, y, hasPickaxe=false) {
  if (x<0||x>=COLS||y<0||y>=ROWS) return false;
  const c = maze[y][x];
  if (c===WALL) return false;
  if (c===BREAKABLE) return hasPickaxe;
  if (c===LAVA) return false;
  return true;
}
function movePos(x,y,dir) { return [(x+dir[0]+COLS)%COLS,(y+dir[1]+ROWS)%ROWS]; }

function initGhosts() {
  return GHOST_COLORS.map((color,i)=>({
    x:9+(i%2), y:10+Math.floor(i/2), dir:[1,0],
    color, name:GHOST_NAMES[i],
    scared:false, scaredTimer:0, exitDelay:i*40,
    exploding:false, explodeTimer:0,
  }));
}
function initIngredients() {
  return INGREDIENT_POSITIONS.map((p,i)=>({...p,id:i,collected:false}));
}

// ─── Ghost AI ─────────────────────────────────────────────────────────────────
function moveGhost(ghost, maze, px, py, nightMode) {
  if (ghost.exploding) return {...ghost, explodeTimer:ghost.explodeTimer-1, exploding:ghost.explodeTimer>1};
  if (ghost.exitDelay>0) return {...ghost, exitDelay:ghost.exitDelay-1};

  const possible = Object.values(DIR).filter(d=>{
    const [nx,ny] = movePos(ghost.x,ghost.y,d);
    return isWalkable(maze,nx,ny);
  });
  const rev = [-ghost.dir[0],-ghost.dir[1]];
  const nonRev = possible.filter(d=>!(d[0]===rev[0]&&d[1]===rev[1]));
  const cands = nonRev.length>0?nonRev:possible;
  if (!cands.length) return ghost;

  let chosen;
  if (ghost.scared) {
    chosen = cands[Math.floor(Math.random()*cands.length)];
  } else {
    if (ghost.name==="Enderman"&&nightMode&&Math.random()<0.1) {
      const open=[];
      maze.forEach((row,y)=>row.forEach((c,x)=>{ if(c!==WALL&&c!==LAVA&&c!==BREAKABLE) open.push({x,y}); }));
      const t=open[Math.floor(Math.random()*open.length)];
      return {...ghost,x:t.x,y:t.y,scaredTimer:Math.max(0,ghost.scaredTimer-1),scared:ghost.scared&&ghost.scaredTimer>1};
    }
    chosen = cands.reduce((best,d)=>{
      const [nx,ny]=movePos(ghost.x,ghost.y,d);
      const [bx,by]=movePos(ghost.x,ghost.y,best);
      return (Math.abs(nx-px)+Math.abs(ny-py))<(Math.abs(bx-px)+Math.abs(by-py))?d:best;
    });
  }
  const [nx,ny] = movePos(ghost.x,ghost.y,chosen);
  return {...ghost,x:nx,y:ny,dir:chosen,scared:ghost.scared&&ghost.scaredTimer>1,scaredTimer:Math.max(0,ghost.scaredTimer-1)};
}

// ─── Sprites ──────────────────────────────────────────────────────────────────
function SteveSprite({ dir, mouthOpen, size=CELL, hasShield }) {
  const rot = dir==="RIGHT"?0:dir==="LEFT"?180:dir==="UP"?270:90;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{transform:`rotate(${rot}deg)`,display:'block'}}>
      {hasShield&&<rect x="0" y="0" width="16" height="16" fill="none" stroke="#4FC3F7" strokeWidth="2" rx="3" opacity="0.9"/>}
      <rect x="2" y="1" width="12" height="12" fill="#C8A57A"/>
      <rect x="2" y="1" width="12" height="4" fill="#5B3A1E"/>
      <rect x="2" y="1" width="2" height="6" fill="#5B3A1E"/>
      <rect x="4" y="5" width="2" height="2" fill="white"/>
      <rect x="10" y="5" width="2" height="2" fill="white"/>
      <rect x="5" y="6" width="1" height="1" fill="#1a1a2e"/>
      <rect x="11" y="6" width="1" height="1" fill="#1a1a2e"/>
      <rect x="7" y="7" width="2" height="1" fill="#A07050"/>
      {mouthOpen
        ? <><rect x="5" y="9" width="6" height="2" fill="#1a1a2e"/><rect x="5" y="9" width="2" height="1" fill="white"/><rect x="9" y="9" width="2" height="1" fill="white"/></>
        : <rect x="5" y="9" width="6" height="1" fill="#5B3A1E"/>}
    </svg>
  );
}

function GhostSprite({ color, scared, size=CELL, flashing }) {
  const c = scared?(flashing?"#FFF":"#1565C0"):color;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{display:'block'}}>
      <rect x="2" y="3" width="12" height="9" fill={c} rx="5" ry="3"/>
      <rect x="2" y="9" width="2" height="4" fill={c}/>
      <rect x="4" y="10" width="2" height="3" fill="#1a1a2e"/>
      <rect x="6" y="9" width="2" height="4" fill={c}/>
      <rect x="8" y="10" width="2" height="3" fill="#1a1a2e"/>
      <rect x="10" y="9" width="2" height="4" fill={c}/>
      <rect x="12" y="10" width="2" height="3" fill="#1a1a2e"/>
      {scared
        ? <><rect x="5" y="6" width="2" height="2" fill="white"/><rect x="9" y="6" width="2" height="2" fill="white"/><rect x="5" y="9" width="6" height="1" fill="white"/></>
        : <><rect x="4" y="5" width="3" height="3" fill="white"/><rect x="9" y="5" width="3" height="3" fill="white"/><rect x="5" y="6" width="2" height="2" fill="#1a1a2e"/><rect x="10" y="6" width="2" height="2" fill="#1a1a2e"/><rect x="6" y="6" width="1" height="1" fill="white"/><rect x="11" y="6" width="1" height="1" fill="white"/></>}
    </svg>
  );
}

function ExplosionSprite({ size=CELL*2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{display:'block'}}>
      <circle cx="16" cy="16" r="14" fill="#FF6600" opacity="0.85"/>
      <circle cx="16" cy="16" r="9"  fill="#FFCC00"/>
      <circle cx="16" cy="16" r="5"  fill="white"/>
      {[0,45,90,135,180,225,270,315].map((a,i)=>(
        <line key={i} x1="16" y1="16"
          x2={16+14*Math.cos(a*Math.PI/180)}
          y2={16+14*Math.sin(a*Math.PI/180)}
          stroke="#FF6600" strokeWidth="2"/>
      ))}
    </svg>
  );
}

function IngredientSprite({ type, size=12 }) {
  const colors = {wood:"#8B6914",stone:"#888",iron:"#AAAACC",diamond:"#4FC3F7"};
  const labels = {wood:"W",stone:"S",iron:"I",diamond:"D"};
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{display:'block'}}>
      <rect x="1" y="1" width="10" height="10" fill={colors[type]} rx="1"/>
      <text x="6" y="9" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">{labels[type]}</text>
    </svg>
  );
}

function WallCell({ x, y, maze, isBreakable, breakProgress }) {
  const isTop = y===0||maze[y-1]?.[x]!==WALL;
  if (isBreakable) {
    const cracks = Math.floor((breakProgress||0)/34);
    return (
      <div style={{width:CELL,height:CELL,background:'#A0522D',boxSizing:'border-box',border:'2px solid #6B3A1F',position:'relative',overflow:'hidden'}}>
        {cracks>0&&<div style={{position:'absolute',inset:0,background:`repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.3) 3px,rgba(0,0,0,0.3) 4px)`,opacity:cracks*0.5}}/>}
        <div style={{position:'absolute',top:2,left:2,fontSize:10}}>🧱</div>
        {breakProgress>0&&(
          <div style={{position:'absolute',bottom:1,left:1,right:1,height:3,background:'#333',borderRadius:1}}>
            <div style={{width:`${breakProgress}%`,height:'100%',background:'#FF6600',borderRadius:1}}/>
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{width:CELL,height:CELL,background:isTop?'linear-gradient(to bottom,#5D8A3C 40%,#8B5E3C 40%)':'#8B5E3C',boxSizing:'border-box',borderTop:isTop?'2px solid #3A6E1F':'none',border:'1px solid #6B4A2A',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',width:3,height:3,borderRadius:1,background:'#7A5030',top:8,left:6}}/>
      <div style={{position:'absolute',width:3,height:3,borderRadius:1,background:'#7A5030',top:14,left:16}}/>
    </div>
  );
}

function LavaCell({ tick }) {
  return (
    <div style={{width:CELL,height:CELL,background:`hsl(${15+Math.sin(tick*0.4)*10},100%,${45+Math.sin(tick*0.3)*8}%)`,boxSizing:'border-box',border:'1px solid #CC2200',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(90deg,rgba(255,100,0,0.25) 0px,transparent 5px,rgba(255,50,0,0.15) 10px)'}}/>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MinecraftPacman() {
  const [maze,       setMaze]       = useState(cloneMaze);
  const [player,     setPlayer]     = useState({x:10,y:16,dir:"RIGHT",mouthOpen:true});
  const [nextDir,    setNextDir]    = useState([1,0]);
  const [ghosts,     setGhosts]     = useState(initGhosts);
  const [score,      setScore]      = useState(0);
  const [lives,      setLives]      = useState(3);
  const [gameState,  setGameState]  = useState("START");
  const [level,      setLevel]      = useState(1);
  const [dotsLeft,   setDotsLeft]   = useState(()=>countDots(cloneMaze()));
  const [tick,       setTick]       = useState(0);
  const [dayTick,    setDayTick]    = useState(0);
  const [nightMode,  setNightMode]  = useState(false);
  const [inventory,  setInventory]  = useState({wood:0,stone:0,iron:0,diamond:0});
  const [ingredients,setIngredients]= useState(initIngredients);
  const [effects,    setEffects]    = useState({});
  const [breakProg,  setBreakProg]  = useState({});
  const [xpOrbs,     setXpOrbs]     = useState([]);
  const [floats,     setFloats]     = useState([]);
  const [crafting,   setCrafting]   = useState(false);
  const [nightWarn,  setNightWarn]  = useState(false);

  const ref = useRef({});
  ref.current = {maze,player,nextDir,ghosts,score,lives,gameState,dotsLeft,level,tick,dayTick,nightMode,inventory,ingredients,effects,breakProg,xpOrbs};

  const addFloat = useCallback((text,x,y,color="#FFD700")=>{
    const id = Date.now()+Math.random();
    setFloats(prev=>[...prev,{id,text,x,y,color,age:0}]);
    setTimeout(()=>setFloats(prev=>prev.filter(f=>f.id!==id)),1200);
  },[]);

  // Input
  useEffect(()=>{
    const map = {ArrowUp:DIR.UP,ArrowDown:DIR.DOWN,ArrowLeft:DIR.LEFT,ArrowRight:DIR.RIGHT,w:DIR.UP,s:DIR.DOWN,a:DIR.LEFT,d:DIR.RIGHT,W:DIR.UP,S:DIR.DOWN,A:DIR.LEFT,D:DIR.RIGHT};
    const h = e=>{
      if (map[e.key]) { e.preventDefault(); setNextDir(map[e.key]); }
      if (e.key===" "||e.key==="Enter") {
        const gs=ref.current.gameState;
        if (gs==="START"||gs==="GAMEOVER") startGame();
        else if (gs==="PLAYING") setGameState("PAUSED");
        else if (gs==="PAUSED")  setGameState("PLAYING");
      }
      if (e.key==="c"||e.key==="C") setCrafting(o=>!o);
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  const startGame = useCallback(()=>{
    const m=cloneMaze();
    setMaze(m); setPlayer({x:10,y:16,dir:"RIGHT",mouthOpen:true}); setNextDir([1,0]);
    setGhosts(initGhosts()); setScore(0); setLives(3); setDotsLeft(countDots(m));
    setLevel(1); setDayTick(0); setNightMode(false);
    setInventory({wood:0,stone:0,iron:0,diamond:0}); setIngredients(initIngredients());
    setEffects({}); setBreakProg({}); setXpOrbs([]); setFloats([]);
    setGameState("PLAYING");
  },[]);

  const craftItem = useCallback((recipe)=>{
    const inv=ref.current.inventory;
    if (!Object.entries(recipe.ingredients).every(([k,v])=>inv[k]>=v)) return;
    const ni={...inv};
    Object.entries(recipe.ingredients).forEach(([k,v])=>{ ni[k]-=v; });
    setInventory(ni);
    setEffects(prev=>({...prev,[recipe.effect]:recipe.duration}));
    setScore(s=>s+100);
    addFloat(`✨${recipe.name}`,10,10,"#FFD700");
    setCrafting(false);
  },[addFloat]);

  // Game loop
  useEffect(()=>{
    if (gameState!=="PLAYING") return;
    const id=setInterval(()=>{
      const {maze:m,player:p,nextDir:nd,ghosts:gs,score:sc,lives:lv,dotsLeft:dl,dayTick:dt,nightMode:nm,ingredients:ings,effects:ae,breakProg:bp} = ref.current;
      setTick(t=>t+1);

      // Day/Night
      const ndt=dt+1; const DAY=200;
      const newNight=Math.floor(ndt/DAY)%2===1;
      setDayTick(ndt);
      if (newNight!==nm){ setNightMode(newNight); if(newNight){setNightWarn(true);setTimeout(()=>setNightWarn(false),2500);}}

      // Tick effects
      const ne={};
      Object.entries(ae).forEach(([k,v])=>{ if(v>1)ne[k]=v-1; });
      setEffects(ne);

      // Age floats
      setFloats(prev=>prev.map(f=>({...f,age:f.age+1})).filter(f=>f.age<40));
      setXpOrbs(prev=>prev.map(o=>({...o,age:o.age+1})).filter(o=>o.age<50));

      const hasPickaxe=!!ne.superPickaxe;
      const dirNames={"0,-1":"UP","0,1":"DOWN","-1,0":"LEFT","1,0":"RIGHT"};

      // Try next dir
      let [nx,ny]=movePos(p.x,p.y,nd);
      let newDir=nd;
      const tc=m[ny]?.[nx];

      if (tc===BREAKABLE&&!hasPickaxe){
        const key=`${nx},${ny}`;
        const prev=bp[key]||0, np=prev+25;
        if (np>=100){
          const nm2=m.map((r,ri)=>ri===ny?r.map((c,ci)=>ci===nx?EATEN:c):r);
          setMaze(nm2); setBreakProg(b=>{const n2={...b};delete n2[key];return n2;});
          setInventory(i=>({...i,stone:i.stone+1}));
          addFloat("+stone",nx,ny,"#aaa");
        } else { setBreakProg(b=>({...b,[key]:np})); }
        nx=p.x; ny=p.y;
      } else if (!isWalkable(m,nx,ny,hasPickaxe)){
        const cd=p.dir==="RIGHT"?DIR.RIGHT:p.dir==="LEFT"?DIR.LEFT:p.dir==="UP"?DIR.UP:DIR.DOWN;
        [nx,ny]=movePos(p.x,p.y,cd);
        if (!isWalkable(m,nx,ny,hasPickaxe)){nx=p.x;ny=p.y;}
        else newDir=cd;
      }
      const newDirName=dirNames[newDir.toString()]||p.dir;

      // Eat dots/power
      let newScore=sc,newDots=dl,newMaze=m,scared=0;
      if (m[ny]?.[nx]===DOT){newMaze=m.map((r,ri)=>ri===ny?r.map((c,ci)=>ci===nx?EATEN:c):r);newScore+=10;newDots--;}
      else if (m[ny]?.[nx]===POWER){newMaze=m.map((r,ri)=>ri===ny?r.map((c,ci)=>ci===nx?EATEN:c):r);newScore+=50;newDots--;scared=60;addFloat("⚡TNT!",nx,ny,"#FF4400");}

      // Collect ingredients
      const newIngs=ings.map(ing=>{
        if (!ing.collected&&ing.x===nx&&ing.y===ny){
          setInventory(i=>({...i,[ing.type]:i[ing.type]+1}));
          addFloat(`+${ing.type}`,nx,ny,ing.type==="diamond"?"#4FC3F7":"#FFDD88");
          return {...ing,collected:true};
        }
        return ing;
      });
      setIngredients(newIngs);

      // Lava
      if (m[ny]?.[nx]===LAVA&&!ne.shield){
        const nl=lv-1; setLives(nl); setGameState("DEAD");
        addFloat("🔥LAVA!",nx,ny,"#FF4500");
        if (nl<=0) setTimeout(()=>setGameState("GAMEOVER"),1500);
        else setTimeout(()=>setGameState("PLAYING"),1500);
        return;
      }

      // Move ghosts
      let newGhosts=gs.map(g=>{
        let ng=moveGhost(g,newMaze,nx,ny,newNight);
        if (scared>0) ng={...ng,scared:true,scaredTimer:scared};
        return ng;
      });

      // Collision
      let died=false;
      newGhosts=newGhosts.map(g=>{
        if (g.exploding) return g;
        if (Math.abs(g.x-nx)<1&&Math.abs(g.y-ny)<1){
          if (g.scared){
            newScore+=200;
            addFloat("💀+200",g.x,g.y,"#00FF88");
            setXpOrbs(prev=>[...prev,...[0,1,2].map(i=>({x:g.x+(Math.random()*2-1),y:g.y+(Math.random()*2-1),id:Date.now()+i,age:0}))]);
            return {...g,x:GHOST_HOME.x,y:GHOST_HOME.y,scared:false,scaredTimer:0,exitDelay:30,exploding:true,explodeTimer:18};
          } else if (!ne.shield){ died=true; }
          else { addFloat("🛡️BLOCKED",nx,ny,"#4FC3F7"); }
        }
        return g;
      });

      if (died){
        setMaze(newMaze);setScore(newScore);
        const nl=lv-1;setLives(nl);setGameState("DEAD");
        if(nl<=0)setTimeout(()=>setGameState("GAMEOVER"),1500);
        else{setPlayer({x:10,y:16,dir:"RIGHT",mouthOpen:true});setGhosts(initGhosts());setTimeout(()=>setGameState("PLAYING"),1500);}
        return;
      }
      if (newDots<=0){
        setMaze(newMaze);setScore(newScore+500);setLevel(l=>l+1);setGameState("WIN");
        setTimeout(()=>{
          const fm=cloneMaze();setMaze(fm);setDotsLeft(countDots(fm));
          setPlayer({x:10,y:16,dir:"RIGHT",mouthOpen:true});setGhosts(initGhosts());setIngredients(initIngredients());
          setGameState("PLAYING");
        },2000);
        return;
      }
      setMaze(newMaze);setPlayer({x:nx,y:ny,dir:newDirName,mouthOpen:!p.mouthOpen});
      setGhosts(newGhosts);setScore(newScore);setDotsLeft(newDots);
    },1000/FPS);
    return ()=>clearInterval(id);
  },[gameState,addFloat]);

  const W=COLS*CELL, H=ROWS*CELL;
  const nightVision=!!effects.nightVision;
  const skyColor=nightMode?`hsl(230,50%,8%)`:`hsl(200,70%,55%)`;
  const handleDpad=dir=>{ setNextDir(dir); if(gameState==="START"||gameState==="GAMEOVER")startGame(); };

  return (
    <div style={{minHeight:'100vh',background:skyColor,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'"Press Start 2P",monospace',padding:'10px',userSelect:'none',transition:'background 3s ease'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        *{box-sizing:border-box;}body{margin:0;}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
        @keyframes floatUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-50px);opacity:0}}
        @keyframes orbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes nightFlash{0%,100%{opacity:0}50%{opacity:1}}
        @keyframes explode{0%{transform:scale(0.5);opacity:1}100%{transform:scale(1.5);opacity:0}}
      `}</style>

      {/* Title */}
      <div style={{marginBottom:8,textAlign:'center'}}>
        <div style={{fontSize:15,color:'#5D8A3C',letterSpacing:2,textShadow:'2px 2px #3A6E1F,4px 4px #000'}}>⛏ MINE-PAC ⛏</div>
      </div>

      {/* HUD */}
      <div style={{display:'flex',gap:14,marginBottom:5,fontSize:8,alignItems:'center',flexWrap:'wrap',justifyContent:'center'}}>
        <span style={{color:'#FFD700'}}>SCORE:{score}</span>
        <span style={{color:'#5D8A3C'}}>LVL:{level}</span>
        <span>{"❤️".repeat(lives)}{"🖤".repeat(Math.max(0,3-lives))}</span>
        <span style={{color:nightMode?"#AAAAFF":"#FFDD44",fontSize:6}}>{nightMode?"🌙 NIGHT":"☀️ DAY"}</span>
        <span style={{color:'#666',fontSize:6}}>[C]=CRAFT</span>
      </div>

      {/* Inventory */}
      <div style={{display:'flex',gap:8,marginBottom:6,background:'rgba(0,0,0,0.6)',padding:'4px 10px',border:'1px solid #333',borderRadius:2,flexWrap:'wrap',justifyContent:'center'}}>
        {Object.entries(inventory).map(([type,count])=>(
          <div key={type} style={{display:'flex',alignItems:'center',gap:3,fontSize:7,color:type==="diamond"?"#4FC3F7":"#ccc"}}>
            <IngredientSprite type={type} size={11}/><span>{count}</span>
          </div>
        ))}
        {Object.entries(effects).map(([e,t])=>(
          <div key={e} style={{fontSize:8,animation:'pulse 0.6s infinite',title:e}}>
            {e==="speed"?"👟":e==="shield"?"🛡️":e==="superPickaxe"?"⛏️":"👁️"}
            <span style={{fontSize:5,color:'#aaa'}}>{t}</span>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={{position:'relative',width:W,height:H,border:'3px solid #5D8A3C',boxShadow:'0 0 25px rgba(93,138,60,0.5)',background:'#0a0a0a',overflow:'hidden'}}>

        {/* Maze */}
        {maze.map((row,y)=>row.map((cell,x)=>{
          const px=x*CELL,py=y*CELL,key=`${x}-${y}`;
          if (cell===WALL) return <div key={key} style={{position:'absolute',left:px,top:py}}><WallCell x={x} y={y} maze={maze} isBreakable={false}/></div>;
          if (cell===BREAKABLE) return <div key={key} style={{position:'absolute',left:px,top:py}}><WallCell x={x} y={y} maze={maze} isBreakable breakProgress={breakProg[`${x},${y}`]||0}/></div>;
          if (cell===LAVA) return <div key={key} style={{position:'absolute',left:px,top:py}}><LavaCell tick={tick}/></div>;
          if (cell===DOT) return (
            <div key={key} style={{position:'absolute',left:px+CELL/2-5,top:py+CELL/2-5}}>
              <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" fill="#FFD700"/><circle cx="5" cy="5" r="2" fill="#FFA500"/></svg>
            </div>
          );
          if (cell===POWER) return (
            <div key={key} style={{position:'absolute',left:px+CELL/2-7,top:py+CELL/2-7,animation:'pulse 0.9s ease-in-out infinite'}}>
              <svg width="14" height="14" viewBox="0 0 14 14">
                <rect x="2" y="2" width="10" height="10" fill="#CC0000"/>
                <rect x="2" y="2" width="10" height="3" fill="#CCC"/>
                <rect x="2" y="5" width="10" height="2" fill="#CC0000"/>
                <rect x="2" y="7" width="10" height="2" fill="#CCC"/>
                <rect x="2" y="9" width="10" height="3" fill="#CC0000"/>
                <text x="7" y="9.5" textAnchor="middle" fontSize="4" fill="white" fontWeight="bold">TNT</text>
              </svg>
            </div>
          );
          return null;
        }))}

        {/* Ingredients */}
        {ingredients.filter(i=>!i.collected).map(ing=>(
          <div key={ing.id} style={{position:'absolute',left:ing.x*CELL+CELL/2-6,top:ing.y*CELL+CELL/2-6,animation:'orbBob 1.8s ease-in-out infinite',filter:'drop-shadow(0 0 4px rgba(255,220,100,0.7))'}}>
            <IngredientSprite type={ing.type} size={12}/>
          </div>
        ))}

        {/* Torches */}
        {TORCH_POSITIONS.map(([tx,ty],i)=>(
          <div key={i} style={{position:'absolute',left:tx*CELL+CELL/2-6,top:ty*CELL+CELL/2-14,pointerEvents:'none',zIndex:4}}>
            <div style={{fontSize:13,filter:`drop-shadow(0 0 ${6+Math.sin(tick*0.4+i)*3}px rgba(255,160,0,0.9))`}}>🔥</div>
            <div style={{position:'absolute',width:CELL*3.5,height:CELL*3.5,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,150,0,0.14) 0%,transparent 70%)',left:-CELL*1.5,top:-CELL*1.2,pointerEvents:'none'}}/>
          </div>
        ))}

        {/* XP Orbs */}
        {xpOrbs.map(o=>(
          <div key={o.id} style={{position:'absolute',left:o.x*CELL+CELL/2-5,top:o.y*CELL+CELL/2-5,animation:'floatUp 1.2s ease-out forwards',zIndex:8}}>
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#00FF88" opacity="0.9"/><circle cx="5" cy="5" r="2" fill="#AAFFCC"/></svg>
          </div>
        ))}

        {/* Floating texts */}
        {floats.map(f=>(
          <div key={f.id} style={{position:'absolute',left:f.x*CELL,top:f.y*CELL-f.age*1.2,fontSize:6,color:f.color,fontFamily:'"Press Start 2P",monospace',pointerEvents:'none',zIndex:20,textShadow:'1px 1px #000',opacity:Math.max(0,1-f.age/40),whiteSpace:'nowrap'}}>
            {f.text}
          </div>
        ))}

        {/* Player */}
        <div style={{position:'absolute',left:player.x*CELL,top:player.y*CELL,zIndex:10,transition:'left 0.1s linear,top 0.1s linear',filter:effects.speed?'drop-shadow(0 0 6px #00FFFF)':undefined}}>
          <SteveSprite dir={player.dir} mouthOpen={player.mouthOpen} size={CELL} hasShield={!!effects.shield}/>
        </div>

        {/* Ghosts */}
        {ghosts.map((g,i)=>(
          <div key={i} style={{position:'absolute',left:g.x*CELL,top:g.y*CELL,zIndex:9,transition:'left 0.1s linear,top 0.1s linear',opacity:g.exitDelay>0?0.4:1}}>
            {g.exploding
              ? <div style={{marginLeft:-CELL/2,marginTop:-CELL/2,animation:'explode 0.4s ease-out'}}><ExplosionSprite size={CELL*2}/></div>
              : <GhostSprite color={g.color} scared={g.scared} size={CELL} flashing={g.scared&&g.scaredTimer<15}/>}
          </div>
        ))}

        {/* Night overlay with torch cutouts */}
        {nightMode&&!nightVision&&(
          <div style={{
            position:'absolute',inset:0,pointerEvents:'none',zIndex:15,
            background:'rgba(0,0,20,0.78)',
            maskImage:TORCH_POSITIONS.map(([tx,ty])=>`radial-gradient(circle at ${tx*CELL+CELL/2}px ${ty*CELL+CELL/2}px,transparent ${CELL*2}px,black ${CELL*3.5}px)`).join(','),
            WebkitMaskImage:TORCH_POSITIONS.map(([tx,ty])=>`radial-gradient(circle at ${tx*CELL+CELL/2}px ${ty*CELL+CELL/2}px,transparent ${CELL*2}px,black ${CELL*3.5}px)`).join(','),
            maskComposite:'intersect',WebkitMaskComposite:'source-in',
          }}/>
        )}

        {/* Night warning */}
        {nightWarn&&(
          <div style={{position:'absolute',top:'42%',left:0,right:0,textAlign:'center',fontSize:9,color:'#AAAAFF',zIndex:25,animation:'nightFlash 0.5s ease-in-out 4',textShadow:'0 0 12px #6666FF',fontFamily:'"Press Start 2P",monospace'}}>
            🌙 NIGHT FALLS... 🌙
          </div>
        )}

        {/* Game overlays */}
        {gameState==="START"&&<Overlay><div style={{color:'#5D8A3C',fontSize:12,marginBottom:10}}>⛏ MINE-PAC ⛏</div><div style={{fontSize:6,color:'#aaa',lineHeight:2.2,marginBottom:10,textAlign:'center'}}>🪙 EAT GOLD COINS<br/>💣 TNT = POWER UP<br/>🧱 MINE DIRT WALLS<br/>🔥 AVOID LAVA<br/>💎 COLLECT INGREDIENTS<br/>[C] OPEN CRAFTING</div><PixelButton onClick={startGame}>START GAME</PixelButton></Overlay>}
        {gameState==="PAUSED"&&<Overlay><div style={{color:'#FFD700',fontSize:12}}>PAUSED</div><PixelButton onClick={()=>setGameState("PLAYING")} style={{marginTop:14}}>RESUME</PixelButton></Overlay>}
        {gameState==="DEAD"&&<Overlay><div style={{color:'#FF4444',fontSize:11}}>YOU DIED!</div><div style={{fontSize:7,color:'#aaa',marginTop:8}}>{lives>0?`${lives} LIVES LEFT`:'GAME OVER'}</div></Overlay>}
        {gameState==="WIN"&&<Overlay><div style={{color:'#5D8A3C',fontSize:11}}>LEVEL CLEAR!</div><div style={{fontSize:7,color:'#FFD700',marginTop:8}}>+500 BONUS!</div></Overlay>}
        {gameState==="GAMEOVER"&&<Overlay><div style={{color:'#FF4444',fontSize:11,marginBottom:8}}>GAME OVER</div><div style={{color:'#FFD700',fontSize:8,marginBottom:14}}>SCORE:{score}</div><PixelButton onClick={startGame}>PLAY AGAIN</PixelButton></Overlay>}
      </div>

      {/* Crafting panel */}
      {crafting&&gameState==="PLAYING"&&(
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'#111',border:'3px solid #5D8A3C',padding:16,zIndex:300,minWidth:270,boxShadow:'0 0 50px rgba(0,0,0,0.9)'}}>
          <div style={{color:'#FFD700',fontSize:10,marginBottom:10,textAlign:'center'}}>⚒ CRAFTING TABLE</div>
          <div style={{color:'#777',fontSize:6,marginBottom:8,textAlign:'center'}}>W:{inventory.wood} · S:{inventory.stone} · I:{inventory.iron} · D:{inventory.diamond}</div>
          {RECIPES.map((r,i)=>{
            const ok=Object.entries(r.ingredients).every(([k,v])=>inventory[k]>=v);
            return (
              <div key={i} onClick={()=>ok&&craftItem(r)} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7,padding:'6px 8px',background:ok?'rgba(93,138,60,0.2)':'rgba(255,255,255,0.03)',border:`1px solid ${ok?'#5D8A3C':'#333'}`,cursor:ok?'pointer':'default'}}>
                <span style={{fontSize:15}}>{r.icon}</span>
                <div style={{flex:1}}>
                  <div style={{color:ok?'#FFD700':'#555',fontSize:7}}>{r.name}</div>
                  <div style={{color:'#444',fontSize:5.5,marginTop:2}}>{Object.entries(r.ingredients).map(([k,v])=>`${k}×${v}`).join(' + ')}</div>
                </div>
                {ok&&<span style={{color:'#5D8A3C',fontSize:7}}>▶ CRAFT</span>}
              </div>
            );
          })}
          <PixelButton onClick={()=>setCrafting(false)} style={{width:'100%',marginTop:8,fontSize:7}}>CLOSE [C]</PixelButton>
        </div>
      )}

      {/* D-Pad */}
      <div style={{marginTop:12}}>
        <div style={{display:'flex',justifyContent:'center',marginBottom:3}}><DpadBtn onClick={()=>handleDpad(DIR.UP)}>▲</DpadBtn></div>
        <div style={{display:'flex',gap:4,justifyContent:'center'}}>
          <DpadBtn onClick={()=>handleDpad(DIR.LEFT)}>◄</DpadBtn>
          <DpadBtn onClick={()=>{if(gameState==="PLAYING")setGameState("PAUSED");else if(gameState==="PAUSED")setGameState("PLAYING");else startGame();}} style={{background:'#5D8A3C',fontSize:8}}>II</DpadBtn>
          <DpadBtn onClick={()=>handleDpad(DIR.RIGHT)}>►</DpadBtn>
        </div>
        <div style={{display:'flex',justifyContent:'center',marginTop:3}}><DpadBtn onClick={()=>handleDpad(DIR.DOWN)}>▼</DpadBtn></div>
      </div>

      <div style={{marginTop:8,fontSize:6,color:'#333',textAlign:'center',lineHeight:2}}>WASD/ARROWS=MOVE · SPACE=PAUSE · C=CRAFT</div>
    </div>
  );
}

function Overlay({children}) {
  return <div style={{position:'absolute',inset:0,background:'rgba(5,5,5,0.88)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:100,fontFamily:'"Press Start 2P",monospace'}}>{children}</div>;
}
function PixelButton({onClick,children,style}) {
  return <button onClick={onClick} style={{fontFamily:'"Press Start 2P",monospace',fontSize:9,background:'#5D8A3C',color:'white',border:'none',padding:'10px 18px',cursor:'pointer',boxShadow:'3px 3px 0 #3A6E1F',...style}} onMouseDown={e=>e.currentTarget.style.transform='translate(2px,2px)'} onMouseUp={e=>e.currentTarget.style.transform=''}>{children}</button>;
}
function DpadBtn({onClick,children,style}) {
  return <button onClick={onClick} style={{width:44,height:44,fontFamily:'"Press Start 2P",monospace',fontSize:14,background:'#222',color:'#5D8A3C',border:'2px solid #444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:4,...style}}>{children}</button>;
}