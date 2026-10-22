/* BGM Business Growth Game frontend. Configure the project URL and anon/publishable key below. */
(() => {
  const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
  const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY";
  const $ = (id) => document.getElementById(id);
  const state = { lang: "en", client: null, member: null, challenge: null, questions: [], index: 0, selected: null, answered: false, timer: null };
  const copy = {
    en: {
      door: "Join Daily Challenge", back: "← Back to cards", title: "BGM Business Growth Game", subtitle: "One shared challenge. Ten decisions. Better business instincts.",
      register: "Join the daily challenge", name: "Display name", phone: "WhatsApp number", consent: "I agree that my display name and score may appear on the BGM leaderboard. My WhatsApp number stays private.",
      join: "Join & play", loading: "Loading today's challenge…", setup: "The game backend hasn't been connected yet. The database schema is ready in the repository; an organizer needs to configure Supabase and publish today's ten questions.",
      noChallenge: "The next challenge hasn't been published yet. Check back at noon Cairo time.",
      countdown: "NEXT CHALLENGE IN", question: "QUESTION", of: "OF", submit: "Lock my answer", next: "Next question →", finish: "View weekly leaderboard", correct: "Correct decision!", incorrect: "Not quite — here's the reasoning.", points: "POINTS EARNED", leaderboard: "WEEKLY LEADERBOARD", expert: "EXPERT SKILL OF THE WEEK", privacy: "WhatsApp numbers are private and are not shown on the leaderboard.", already: "You've already answered this question. Your score won't be counted twice.", error: "Something went wrong. Please try again.", done: "You've completed today's challenge!", score: "Today's points", back: "Back to challenge", categories: "CUSTOMER DISCOVERY · SALES · MARKETING · STRATEGY · NEGOTIATION"
    },
    ar: {
      door: "شارك في تحدي النهارده", back: "ارجع للكروت ←", title: "لعبة BGM لنمو البيزنس", subtitle: "تحدي واحد للجميع. ١٠ قرارات. وتفكير أقوى في البيزنس.",
      register: "شارك في تحدي النهارده", name: "الاسم اللي هيظهر", phone: "رقم WhatsApp", consent: "موافق إن اسمي ونتيجتي يظهروا في ترتيب BGM. رقم WhatsApp هيفضل خاص.",
      join: "سجّل وابدأ", loading: "بنحمّل تحدي النهارده…", setup: "اللعبة لسه محتاجة ربط بالـ backend. ملف قاعدة البيانات موجود في الريبو؛ المنظّم محتاج يضبط Supabase وينشر أسئلة النهارده العشرة.",
      noChallenge: "تحدي جديد لسه ما اتنشرش. ارجع وقت الظهر بتوقيت القاهرة.",
      countdown: "التحدي الجديد بعد", question: "السؤال", of: "من", submit: "ثبّت إجابتي", next: "السؤال التالي ←", finish: "شوف ترتيب الأسبوع", correct: "إجابة موفقة!", incorrect: "مش دي أقوى إجابة — وده السبب.", points: "النقاط المكتسبة", leaderboard: "ترتيب الأسبوع", expert: "مهارة الأسبوع", privacy: "أرقام WhatsApp خاصة ومش بتظهر في الترتيب.",
      already: "إنت جاوبت السؤال ده قبل كده. مش هتتحسب نقاط مرتين.", error: "حصلت مشكلة. جرّب تاني.", done: "كملت تحدي النهارده!", score: "نقاط النهارده", back: "ارجع للتحدي", categories: "فهم العملاء · المبيعات · التسويق · الاستراتيجية · التفاوض"
    }
  };
  const t = (k) => copy[state.lang][k] || copy.en[k] || k;
  const configured = () => window.supabase && SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
  function setText(id, key) { const el = $(id); if (el) el.textContent = t(key); }
  function setLanguage(lang) {
    state.lang = lang;
    $("bgmGamePanel").dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    $("bgmGameEn").setAttribute("aria-pressed", String(lang === "en"));
    $("bgmGameAr").setAttribute("aria-pressed", String(lang === "ar"));
    ["bgmGameDoorLabel:door","bgmGameClose:back","bgmGameTitle:title","bgmGameSubtitle:subtitle","bgmGameRegisterTitle:register","bgmGameNameLabel:name","bgmGamePhoneLabel:phone","bgmGameConsentLabel:consent","bgmGameJoin:join","bgmGameCountdownLabel:countdown","bgmGameLeaderboardTitle:leaderboard","bgmGamePrivacy:privacy","bgmGameCategories:categories"].forEach(pair => { const [id,key]=pair.split(":"); setText(id,key); });
    if (state.challenge) renderQuestion();
    renderLeaderboard();
  }
  function status(message) { $("bgmGameStatus").textContent = message; }
  function showCountdown() {
    clearInterval(state.timer);
    const tick = () => {
      const now = Date.now();
      const end = state.challenge ? new Date(state.challenge.ends_at).getTime() : nextCairoNoon();
      let ms = Math.max(0, end - now);
      const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
      $("bgmGameCountdown").textContent = [h,m,s].map(n=>String(n).padStart(2,"0")).join(":");
      if (ms === 0) loadChallenge();
    };
    tick(); state.timer = setInterval(tick,1000);
  }
  // Noon fallback is only a visual fallback. The active challenge's server ends_at is authoritative.
  function nextCairoNoon() {
    const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(x=>[x.type,x.value]));
    const cairo = new Date(new Date().toLocaleString("en-US",{timeZone:"Africa/Cairo"}));
    const target = new Date(cairo); target.setHours(12,0,0,0); if(cairo >= target) target.setDate(target.getDate()+1);
    return Date.now() + (target - cairo);
  }
  async function loadChallenge() {
    if (!configured()) { status(t("setup")); $("bgmGameQuestionArea").hidden = true; showCountdown(); return; }
    try {
      const {data,error}=await state.client.rpc("bgm_get_active_challenge",{p_now:new Date().toISOString()});
      if(error) throw error;
      if(!data || !data.active) { state.challenge=null; $("bgmGameQuestionArea").hidden=true; status(t("noChallenge")); showCountdown(); return; }
      state.challenge=data; state.questions=data.questions||[]; state.index=0; state.selected=null; state.answered=false;
      $("bgmGameQuestionArea").hidden=false; status("");
      $("bgmGameExpert").textContent=(state.lang==="ar"?"مهارة الأسبوع: ":"EXPERT SKILL OF THE WEEK: ")+data.expert_skill;
      showCountdown(); renderQuestion();
    } catch(e) { status(t("error")+" "+(e.message||"")); }
  }
  function renderQuestion() {
    const q=state.questions[state.index]; if(!q) { $("bgmGameQuestionArea").hidden=true; status(t("done")); return; }
    $("bgmGameQuestionNo").textContent=t("question")+" "+(state.index+1)+" "+t("of")+" "+state.questions.length;
    $("bgmGameSkill").textContent=q.skill_category;
    $("bgmGamePrompt").textContent=state.lang==="ar"?q.prompt_ar:q.prompt_en;
    const options=state.lang==="ar"?q.options_ar:q.options_en;
    $("bgmGameOptions").innerHTML=options.map((o,i)=>'<button class="bgm-game-option" type="button" data-option="'+i+'"><span class="bgm-game-option-letter">'+String.fromCharCode(65+i)+'</span><span></span></button>').join("");
    [...$("bgmGameOptions").querySelectorAll("button")].forEach((b,i)=>{b.querySelector("span:last-child").textContent=options[i];b.disabled=state.answered;b.addEventListener("click",()=>{if(state.answered)return;state.selected=i;[...$("bgmGameOptions").children].forEach(x=>x.classList.toggle("selected",x===b));$("bgmGameSubmit").disabled=false;});});
    $("bgmGameFeedback").hidden=true; $("bgmGameSubmit").hidden=false; $("bgmGameSubmit").disabled=true; $("bgmGameNext").hidden=true;
    setText("bgmGameSubmit","submit");setText("bgmGameNext",state.index===state.questions.length-1?"finish":"next");
    $("bgmGameProgress").textContent=(state.index+1)+" / "+state.questions.length;
  }
  async function submitAnswer() {
    if(!state.member||state.selected===null||state.answered)return;
    const q=state.questions[state.index]; $("bgmGameSubmit").disabled=true;
    try {
      const {data,error}=await state.client.rpc("bgm_submit_answer",{p_member_id:state.member.member_id,p_question_id:q.id,p_selected_option:state.selected});
      if(error)throw error;
      if(!data.accepted){status(t("already"));state.answered=true;$("bgmGameSubmit").hidden=true;$("bgmGameNext").hidden=false;return;}
      state.answered=true;
      [...$("bgmGameOptions").children].forEach((b,i)=>{b.disabled=true;if(i===state.selected)b.classList.add(data.correct?"correct":"incorrect");});
      const explanation=state.lang==="ar"?data.explanation_ar:data.explanation_en;
      $("bgmGameFeedback").hidden=false;
      $("bgmGameFeedback").innerHTML="<strong>"+t(data.correct?"correct":"incorrect")+"</strong><div>"+t("points")+": "+data.points_awarded+"</div><p></p>";
      $("bgmGameFeedback").querySelector("p").textContent=explanation;
      $("bgmGameSubmit").hidden=true;$("bgmGameNext").hidden=false;
      loadLeaderboard();
    } catch(e){status(t("error")+" "+(e.message||""));$("bgmGameSubmit").disabled=false;}
  }
  async function register() {
    if(!configured()){status(t("setup"));return;}
    const name=$("bgmGameName").value.trim(),phone=$("bgmGamePhone").value.trim();
    if(!name||!phone||!$("bgmGameConsent").checked){status(t("error"));return;}
    try {
      const {data:sessionData}=await state.client.auth.getSession();
      if(!sessionData.session){const {error:authError}=await state.client.auth.signInAnonymously();if(authError)throw authError;}
      const {data,error}=await state.client.rpc("bgm_register_member",{p_display_name:name,p_whatsapp_phone:phone});
      if(error)throw error;
      state.member=data; localStorage.setItem("bgmGameMember",JSON.stringify(data));
      $("bgmGameRegister").hidden=true;$("bgmGameMemberLabel").textContent=data.display_name;
      await loadChallenge();
    } catch(e){status(t("error")+" "+(e.message||""));}
  }
  async function loadLeaderboard() {
    if(!configured())return;
    try {
      const {data,error}=await state.client.rpc("bgm_get_leaderboard",{p_week_start:null});
      if(error)throw error;state.leaderboard=Array.isArray(data)?data:[];renderLeaderboard();
    }catch(e){/* Keep the game playable if the leaderboard is temporarily unavailable. */}
  }
  function renderLeaderboard() {
    const list=$("bgmGameLeaderboard");if(!list)return;
    const rows=state.leaderboard||[];
    list.innerHTML=rows.slice(0,10).map((r,i)=>'<div class="bgm-game-rank"><span class="bgm-game-rank-no">'+(i+1)+'</span><strong></strong><span class="bgm-game-points">'+(r.points||0)+' XP</span></div>').join("");
    [...list.querySelectorAll("strong")].forEach((el,i)=>el.textContent=rows[i].display_name);
    $("bgmGameTopThree").textContent=rows.length?rows.slice(0,3).map((r,i)=>(i+1)+". "+r.display_name+" — "+r.points+" XP").join("  •  "):"—";
  }
  function init() {
    $("bgmGameEn").addEventListener("click",()=>setLanguage("en"));$("bgmGameAr").addEventListener("click",()=>setLanguage("ar"));\n    $("bgmGameDoor").addEventListener("click",()=>{document.body.classList.remove("bgm-survey-open","quest-open");const survey=document.getElementById("bgmSurveyPanel");if(survey)survey.hidden=true;document.body.classList.add("bgm-game-open");$("bgmGamePanel").scrollIntoView({behavior:"smooth",block:"start"});});\n    $("bgmGameClose").addEventListener("click",()=>{document.body.classList.remove("bgm-game-open");window.scrollTo({top:0,behavior:"smooth"});});
    $("bgmGameJoin").addEventListener("click",register);$("bgmGameSubmit").addEventListener("click",submitAnswer);
    $("bgmGameNext").addEventListener("click",()=>{if(state.index<state.questions.length-1){state.index++;state.selected=null;state.answered=false;renderQuestion();}else{status(t("done"));$("bgmGameQuestionArea").hidden=true;}});
    try { const m=JSON.parse(localStorage.getItem("bgmGameMember")||"null");if(m&&m.member_id){state.member=m;$("bgmGameRegister").hidden=true;$("bgmGameMemberLabel").textContent=m.display_name;} }catch(e){}
    if(configured()) {
      state.client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
      (async()=>{
        const {data,error}=await state.client.auth.getSession();
        if(error) { status(t("error")); return; }
        if(!data.session) {
          if(state.member) { state.member=null; try{localStorage.removeItem("bgmGameMember");}catch(e){} $("bgmGameRegister").hidden=false; }
          const {error:authError}=await state.client.auth.signInAnonymously();
          if(authError){status("Participant sign-in is not enabled in Supabase yet. Ask the organizer to enable Anonymous Sign-Ins.");return;}
        }
        if(state.member){$("bgmGameRegister").hidden=true;$("bgmGameMemberLabel").textContent=state.member.display_name;await loadChallenge();}
        else { status(""); showCountdown(); }
        await loadLeaderboard();
      })();
    } else {status(t("setup"));showCountdown();}
    setLanguage("en");
  }
  window.addEventListener("DOMContentLoaded",init);
})();