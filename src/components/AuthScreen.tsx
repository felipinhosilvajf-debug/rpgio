import { useEffect, useState } from "react";
import { useGame } from "../state/GameContext";
import { Avatar, Btn, Input, Label, CORES, CABELOS, PELES } from "./ui";
import type { Sexo } from "../game/types";
import { generateRG } from "../game/types";

export default function AuthScreen() {
  const { login, register, guest, authError, busy } = useGame();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [sexo, setSexo] = useState<Sexo>("masculino");
  const [cor] = useState(CORES[0]);
  const [cabelo] = useState(CABELOS[0]);
  const [pele] = useState(PELES[1]);

  const [previewRG] = useState(() => generateRG());
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((s) => (s + 1) % 3), 5200);
    return () => window.clearInterval(timer);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") return login(email, pass);
    if (step === 1) { setStep(2); return; }
    register(email, pass, { nome, sexo, cor, cabelo, pele, dataNascimento: nascimento });
  };

  const idade = nascimento ? Math.max(0, Math.floor((Date.now() - new Date(nascimento).getTime()) / 3.15576e10)) : null;

  return (
    <div className="crt relative h-screen overflow-y-auto bg-[#0a0f1c] px-4 py-8">
      {/* Sky */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg,#0c1525 0%,#152440 35%,#1d4070 60%,#3f7ad6 80%,#57a049 80%,#3f8c38 100%)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-80">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            left: `${(i * 131 + 7) % 100}%`, top: `${(i * 47 + 3) % 50}%`,
            width: i % 5 === 0 ? 3 : 2, height: i % 5 === 0 ? 3 : 2,
            opacity: 0.12 + ((i * 7) % 10) / 15,
            animation: i % 4 === 0 ? "pulseKey 2.5s infinite" : undefined,
          }} />
        ))}
      </div>
      <div className="pointer-events-none absolute left-[12%] top-[8%] h-20 w-20 rounded-full bg-[#f5e9c8] opacity-30" style={{ boxShadow: "0 0 60px 20px #f5e9c860" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-center gap-0.5 opacity-90">
        {Array.from({ length: 32 }).map((_, i) => {
          const h = 50 + ((i * 67 + 13) % 170);
          const clr = ["#111b30", "#0e1729", "#141f38", "#182642"][i % 4];
          return (
            <div key={i} className="relative" style={{ width: 42, height: h, background: clr, borderTop: "3px solid #24365c" }}>
              {Array.from({ length: Math.floor(h / 22) }).map((__, j) => (
                <div key={j} className="absolute" style={{
                  left: 6 + (j % 2) * 14, top: 8 + j * 20, width: 8, height: 8,
                  background: (i + j) % 3 === 0 ? "#ffd980" : (i + j) % 5 === 0 ? "#7ee0ff33" : "#1a2740",
                }} />
              ))}
            </div>
          );
        })}
      </div>

      <div className="pixel-panel relative z-10 mx-auto w-full max-w-[1080px] overflow-hidden shadow-[0_0_60px_rgba(31,220,255,0.22)]">
        <div className="flex items-center justify-center gap-4 border-b-[3px] border-[#0a1024] bg-gradient-to-r from-[#0f1a30] via-[#162240] to-[#0f1a30] px-6 py-5">
          <div className="text-center">
            <h1 className="font-pixel text-[22px] leading-none text-[#ffd980] drop-shadow-[0_3px_0_#8a5a10]">PIXELCITY</h1>
            <div className="font-pixel mt-2 flex items-center justify-center gap-2">
              <span className="bg-[#3f7ad6] px-2 py-0.5 text-[7px] text-white">RPG</span>
              <span className="bg-[#5d7a45] px-2 py-0.5 text-[7px] text-white">ONLINE</span>
              <span className="bg-[#c07c2a] px-2 py-0.5 text-[7px] text-white">EMISSÃO DE RG</span>
            </div>
          </div>
        </div>

        <div className="mb-3 flex gap-1.5 px-5 pt-4">
          <Btn tone={mode === "login" ? "blue" : "slate"} size="sm" onClick={() => { setMode("login"); setStep(1); }} full>Entrar</Btn>
          <Btn tone={mode === "register" ? "green" : "slate"} size="sm" onClick={() => { setMode("register"); setStep(1); }} full>Emitir Carteira (Cadastro)</Btn>
        </div>

        {mode === "login" ? (
          <div className="grid gap-0 md:grid-cols-2">
            <div className="p-6">
              <form onSubmit={submit} className="space-y-2.5">
                <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@pixelcity.com" required /></div>
                <div><Label>Senha</Label><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="mínimo 6 caracteres" minLength={6} required /></div>
                {authError && (<div className="pixel-inset border-l-4 border-[#c4483f] px-3 py-2 text-xs text-[#ff9a90]">{authError}</div>)}
                <Btn type="submit" tone="blue" size="lg" full disabled={busy}>{busy ? "Conectando..." : "🔑 Entrar na cidade"}</Btn>
              </form>
              <div className="my-3 flex items-center gap-3"><div className="h-[2px] flex-1 bg-[#1c2a4a]" /><span className="font-pixel text-[7px] text-[#3a4d70]">OU</span><div className="h-[2px] flex-1 bg-[#1c2a4a]" /></div>
              <Btn tone="gold" full onClick={() => guest({ nome: "Visitante", sexo: "masculino", cor: CORES[0], cabelo: CABELOS[0], pele: PELES[1], dataNascimento: "" })} disabled={busy}>Jogar como visitante</Btn>
            </div>
            <div className="hidden items-center justify-center border-l-[3px] border-[#0a1024] bg-[#0c1428] p-6 md:flex">
              <div className="space-y-2 text-center">
                <div className="text-5xl">🪪</div>
                <p className="font-pixel text-[9px] text-[#ffd980]">CARTEIRA DE IDENTIDADE RP</p>
                <p className="text-[11px] text-[#5f7099]">Entre com sua conta para acessar seu cartão de cidadão em <code className="text-[#7ee0ff]">/me</code>.</p>
                 <p className="font-pixel text-[7px] text-[#59e08a]">● SERVIDOR ONLINE · DADOS SINCRONIZADOS</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-0 md:grid-cols-[1fr_1.15fr]">
            {/* STEP 1: AVATAR CREATOR */}
            {step === 1 && (
              <>
                <div className="flex flex-col items-center gap-3 border-b-[3px] border-[#0a1024] bg-[#0c1428] p-5 md:border-b-0 md:border-r-[3px]">
                  <div className="pixel-inset flex flex-col items-center gap-2 p-4">
                    <Avatar cor={cor} cabelo={cabelo} cabeloEstilo={sexo === "feminino" ? "longo" : "curto"} pele={pele} sexo={sexo} camisaModelo={sexo === "feminino" ? "blusa" : "camiseta"} inferiorModelo={sexo === "feminino" ? "saia" : "calca"} size={84} />
                    <div className="font-pixel text-[9px] text-[#ffd980]">PASSO 1/2 — IDENTIDADE</div>
                  </div>
                  <div className="w-full space-y-2.5">
                    <div>
                      <Label>Gênero</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([["masculino", "♂ Masculino"], ["feminino", "♀ Feminino"]] as const).map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setSexo(v)} className={`pixel-btn py-2 font-pixel text-[8px] ${sexo === v ? "bg-[#3f7ad6] text-white ring-2 ring-[#7ee0ff]" : "bg-[#1c2a4a] text-[#8fa3c8]"}`}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div className="pixel-inset border-l-2 border-[#43dcff] p-3 text-[11px] leading-relaxed text-[#8fa3c8]">
                      A aparência completa é personalizada dentro da cidade, nas lojas e serviços de visual.
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-center p-6">
                  <p className="mb-3 text-sm text-[#c9d6ee]">🪪 Defina a identidade inicial do cidadão. Roupas e cabelo são personalizados dentro da cidade.</p>
                  <Btn tone="green" size="lg" full onClick={() => setStep(2)}>Avançar → Dados pessoais</Btn>
                </div>
              </>
            )}

            {/* STEP 2: DADOS + RG PREVIEW */}
            {step === 2 && (
              <>
                <div className="border-b-[3px] border-[#0a1024] bg-[#0c1428] p-5 md:border-b-0 md:border-r-[3px]">
                  <div className="font-pixel mb-3 text-[9px] text-[#ffd980]">PASSO 2/2 — CARTEIRA DE IDENTIDADE</div>
                  <div className="pixel-panel overflow-hidden" style={{ background: "linear-gradient(135deg,#1c2a4a,#101a30)" }}>
                    <div className="flex items-center gap-2 border-b-2 border-[#0a1024] bg-[#0a1024] px-3 py-1.5">
                      <span className="text-sm">🪪</span><span className="font-pixel text-[7px] text-[#ffd980]">REPÚBLICA DE PIXELCITY</span>
                    </div>
                    <div className="flex gap-3 p-3">
                      <div className="pixel-inset flex h-[86px] w-[68px] items-center justify-center bg-[#0a1024]"><Avatar cor={cor} cabelo={cabelo} cabeloEstilo={sexo === "feminino" ? "longo" : "curto"} pele={pele} sexo={sexo} camisaModelo={sexo === "feminino" ? "blusa" : "camiseta"} inferiorModelo={sexo === "feminino" ? "saia" : "calca"} size={54} /></div>
                      <div className="min-w-0 flex-1 space-y-1 text-[10px] text-[#c9d6ee]">
                        <div className="font-pixel text-[9px] text-white truncate">{nome.trim() || "NOME NÃO INFORMADO"}</div>
                        <div>RG: <span className="text-[#7ee0ff]">{previewRG}</span></div>
                        <div>Sexo: {sexo === "feminino" ? "Feminino" : "Masculino"}</div>
                        <div>Nasc.: {nascimento || "—"} {idade !== null && <span className="text-[#8fa3c8]">({idade} anos)</span>}</div>
                        <div className="text-[#ffd980]">Status: Civil</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col p-6">
                  <form onSubmit={submit} className="space-y-2.5">
                    <div><Label>Nome RP (personagem)</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Matheus Andrade" maxLength={22} required /></div>
                    <div><Label>Data de nascimento</Label><Input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} required /></div>
                    <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@pixelcity.com" required /></div>
                    <div><Label>Senha</Label><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="mínimo 6 caracteres" minLength={6} required /></div>
                    {authError && (<div className="pixel-inset border-l-4 border-[#c4483f] px-3 py-2 text-xs text-[#ff9a90]">{authError}</div>)}
                    <div className="flex gap-2">
                      <Btn type="button" tone="slate" onClick={() => setStep(1)}>← Voltar</Btn>
                      <Btn type="submit" tone="green" size="lg" full disabled={busy}>{busy ? "Emitindo..." : "🪪 Emitir Carteira e Entrar"}</Btn>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        <LandingShowcase slide={slide} setSlide={setSlide} />

        <div className="border-t-2 border-[#0a1024] bg-[#0a1024] px-6 py-2 text-center font-pixel text-[6px] text-[#3a4d70]">
          🎮 WASD ANDAR · E INTERAGIR · ENTER CHAT · 1-6 HOTBAR
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    tag: "COMBATE RP",
    title: "Ação com responsabilidade",
    text: "Trocas de tiros exigem contexto de roleplay. Respeite áreas seguras, valorize a vida e siga as ordens das forças públicas.",
    icon: "⚔",
    colors: "from-[#561c2d] via-[#2c1725] to-[#111a31]",
  },
  {
    tag: "CARREIRAS",
    title: "Construa sua história",
    text: "Candidate-se ao Exército, Polícia, Bombeiros, Hospital ou Comércio. Trabalhe, ganhe experiência e alcance o alto comando.",
    icon: "★",
    colors: "from-[#173b31] via-[#172c29] to-[#111a31]",
  },
  {
    tag: "PATRIMÔNIO",
    title: "Sua casa, seu espaço",
    text: "Compre imóveis, monte seu inventário e participe de uma economia viva conectada a toda a cidade.",
    icon: "⌂",
    colors: "from-[#17375a] via-[#172942] to-[#111a31]",
  },
] as const;

function LandingShowcase({ slide, setSlide }: { slide: number; setSlide: (n: number) => void }) {
  const current = SLIDES[slide];
  return (
    <div className="border-t-[3px] border-[#0a1024] bg-[#080d19]">
      <div className={`relative min-h-44 overflow-hidden bg-gradient-to-r ${current.colors} px-6 py-7 md:px-10`}>
        <div className="absolute -right-8 -top-12 font-pixel text-[150px] text-white/[0.04]">{current.icon}</div>
        <div className="relative max-w-2xl" key={current.title}>
          <span className="font-pixel text-[7px] text-[#47e7ff]">{current.tag} · NOVIDADES E REGRAS</span>
          <h2 className="font-pixel mt-3 text-[15px] leading-relaxed text-white drop-shadow-[0_0_12px_rgba(71,231,255,0.45)]">{current.title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#b9c8e3]">{current.text}</p>
        </div>
        <div className="relative mt-5 flex gap-2">
          {SLIDES.map((s, i) => (
            <button key={s.tag} onClick={() => setSlide(i)} className={`h-1.5 transition-all ${i === slide ? "w-12 bg-[#47e7ff] shadow-[0_0_10px_#47e7ff]" : "w-6 bg-[#3a4763]"}`} />
          ))}
        </div>
      </div>
      <div className="grid gap-px bg-[#17223b] md:grid-cols-3">
        {[
          ["01", "Crie seu cidadão", "Emita seu RG e defina a identidade do personagem."],
          ["02", "Entre na cidade", "Aprenda os controles no tutorial guiado."],
          ["03", "Viva o roleplay", "Trabalhe, faça alianças e construa patrimônio."],
        ].map(([n, title, text]) => (
          <div key={n} className="bg-[#0d1528] px-5 py-4">
            <span className="font-pixel text-[7px] text-[#47e7ff]">{n}</span>
            <div className="mt-1 font-pixel text-[8px] text-white">{title}</div>
            <p className="mt-1 text-[11px] text-[#7184a8]">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
