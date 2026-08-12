import { useState } from "react";
import { Btn } from "./ui";

const STEPS = [
  { n: "01", icon: "⌨", title: "Movimento & Celular", text: "Use WASD ou as setas para caminhar. Pressione M para abrir e fechar o Celular SmartRP." },
  { n: "02", icon: "E", title: "Interações", text: "Aproxime-se de portas e objetos destacados. Pressione E para entrar no Quartel, Prefeitura, lojas e residências." },
  { n: "03", icon: "1-6", title: "Hotbar", text: "Equipe itens pela mochila e use as teclas 1 a 6 para consumir alimentos ou empunhar equipamentos de roleplay." },
  { n: "04", icon: "★", title: "Primeiro emprego", text: "Visite a Central de Empregos ou o app de carreiras. Envie seu currículo e aguarde a aprovação do líder da corporação." },
] as const;

export default function TutorialOverlay({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#03060d]/90 p-4 backdrop-blur-sm">
      <div className="neon-panel pop-in w-full max-w-2xl overflow-hidden">
        <div className="border-b border-[#284365] bg-gradient-to-r from-[#102d4b] to-[#111a31] px-6 py-4">
          <div className="font-pixel text-[7px] text-[#43dcff]">TUTORIAL DE CHEGADA · PASSO {current.n}</div>
          <h2 className="mt-2 text-2xl font-extrabold text-white">{current.title}</h2>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[150px_1fr]">
          <div className="pixel-inset flex h-36 items-center justify-center bg-[#08111f] font-pixel text-3xl text-[#ffd65a] shadow-[inset_0_0_30px_rgba(67,220,255,0.12)]">{current.icon}</div>
          <div className="flex flex-col justify-center">
            <p className="text-base leading-relaxed text-[#b5c3dc]">{current.text}</p>
            <div className="mt-6 flex gap-2">{STEPS.map((s, i) => <div key={s.n} className={`h-1.5 flex-1 ${i <= step ? "bg-[#43dcff] shadow-[0_0_8px_#43dcff]" : "bg-[#273958]"}`} />)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#284365] bg-[#090f1d] px-6 py-4">
          <button onClick={onFinish} className="text-xs text-[#7184a8] hover:text-white">Pular tutorial</button>
          <div className="flex gap-2">
            <Btn tone="slate" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Voltar</Btn>
            {step < STEPS.length - 1 ? <Btn tone="cyan" onClick={() => setStep((s) => s + 1)}>Próximo</Btn> : <Btn tone="green" onClick={onFinish}>Começar a jogar</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
}