import Link from "next/link";

export const metadata = { title: "Política de Privacidade — LevBeauty" };

export default function PrivacidadePage() {
  const section = (title: string) => (
    <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)", margin: "36px 0 12px", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
      {title}
    </h2>
  );

  const p = (text: string | React.ReactNode) => (
    <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-mid)", lineHeight: 1.8, margin: "0 0 12px" }}>
      {text}
    </p>
  );

  const li = (text: string | React.ReactNode) => (
    <li style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-mid)", lineHeight: 1.8, marginBottom: 6 }}>
      {text}
    </li>
  );

  return (
    <div style={{ minHeight: "100vh", background: "oklch(98% 0.008 75)" }}>
      {/* Nav */}
      <nav style={{ padding: "16px 40px", background: "white", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💅</div>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--mauve-dark)" }}>LevBeauty</span>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", textDecoration: "none" }}>← Voltar ao início</Link>
      </nav>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 32px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--font-poppins)", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>VERSÃO 1.0 — MAIO/2026</p>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: "var(--mauve-dark)", margin: 0 }}>
            Política de Privacidade
          </h1>
        </div>

        {section("1. Quem somos")}
        {p("LevBeauty é uma plataforma SaaS para profissionais autônomas de beleza no Brasil — incluindo manicures, esteticistas, designers de cílios, cabeleireiras, depiladoras, massoterapeutas, podólogas e demais profissionais do setor de beleza e estética.")}

        {section("2. Dados que coletamos")}
        {p("Coletamos as seguintes categorias de dados:")}
        <ul style={{ margin: "0 0 12px 20px", padding: 0 }}>
          {li("Cadastro profissional: nome, e-mail, telefone, endereço do salão/atendimento.")}
          {li("Dados das clientes: nome, telefone, e-mail (opcional), data de nascimento (opcional), CEP.")}
          {li("Dados de saúde sensíveis: informações de anamnese (alergias, condições de saúde, uso de medicamentos) voluntariamente fornecidas pela profissional para fins de atendimento técnico seguro, mediante consentimento explícito da cliente.")}
          {li("Dados de agendamentos: data, hora, serviços, histórico de atendimentos.")}
          {li("Dados financeiros: valores de serviços e transações (sem dados de cartão — processamento externo via Stripe).")}
        </ul>

        {section("3. Finalidade do uso")}
        <ul style={{ margin: "0 0 12px 20px", padding: 0 }}>
          {li("Operacional: gerenciar agendamentos, comunicação entre cliente e profissional.")}
          {li("Técnica: registro de anamnese para prestação de serviço seguro e personalizado.")}
          {li("Comunicação: envio de notificações e lembretes via WhatsApp (mediante consentimento).")}
          {li("Legal: cumprimento de obrigações fiscais e regulatórias.")}
        </ul>

        {section("4. Compartilhamento de dados")}
        {p("Não compartilhamos dados pessoais com terceiros para fins comerciais. O compartilhamento ocorre exclusivamente com parceiros técnicos essenciais:")}
        <ul style={{ margin: "0 0 12px 20px", padding: 0 }}>
          {li("Stripe: processamento de pagamentos (sujeito à Política de Privacidade da Stripe).")}
          {li("Z-API: envio de notificações via WhatsApp.")}
          {li("Supabase: armazenamento seguro de dados (servidores na região sa-east-1 / América do Sul).")}
        </ul>

        {section("5. Seus direitos — LGPD (Lei 13.709/2018)")}
        {p("Como titular de dados, você tem direito a:")}
        <ul style={{ margin: "0 0 12px 20px", padding: 0 }}>
          {li("Confirmar a existência do tratamento dos seus dados.")}
          {li("Acessar os dados que temos sobre você.")}
          {li("Corrigir dados incompletos, inexatos ou desatualizados.")}
          {li("Solicitar a anonimização, bloqueio ou eliminação dos seus dados.")}
          {li("Solicitar a portabilidade dos dados para outro serviço.")}
          {li("Revogar o consentimento a qualquer momento.")}
          {li("Ser informada sobre o uso compartilhado dos dados.")}
        </ul>
        {p(
          <>Para exercer qualquer um desses direitos, envie e-mail para: <strong>[contato@levbeauty.com.br]</strong></>
        )}

        {section("6. Tempo de retenção")}
        <ul style={{ margin: "0 0 12px 20px", padding: 0 }}>
          {li("Dados de cadastro profissional: enquanto a conta estiver ativa.")}
          {li("Dados de clientes e agendamentos: enquanto a profissional os mantiver registrados na plataforma.")}
          {li("Dados de saúde (anamnese): excluídos imediatamente mediante solicitação, independentemente do plano.")}
          {li("Dados financeiros: mantidos pelo período exigido pela legislação fiscal brasileira.")}
        </ul>

        {section("7. Segurança")}
        {p("Adotamos medidas técnicas e organizacionais para proteger seus dados:")}
        <ul style={{ margin: "0 0 12px 20px", padding: 0 }}>
          {li("Criptografia em trânsito (HTTPS/TLS) em todas as comunicações.")}
          {li("Dados armazenados em banco de dados com Row Level Security (RLS) — cada profissional acessa apenas seus próprios dados.")}
          {li("Senhas armazenadas com hash bcrypt (via Supabase Auth).")}
          {li("Tokens de sessão com expiração automática.")}
        </ul>

        {section("8. Cookies e rastreamento")}
        {p("Utilizamos apenas cookies estritamente necessários para autenticação e funcionamento da sessão. Não utilizamos cookies de rastreamento ou publicidade.")}

        {section("9. Atualizações desta política")}
        {p("Esta política pode ser atualizada periodicamente. Em caso de alterações materiais, notificaremos os usuários por e-mail ou via aviso no painel. A versão vigente é sempre a exibida nesta página.")}
        {p("Versão vigente: 1.0 — Maio/2026.")}

        <div style={{ marginTop: 48, padding: "20px 24px", background: "oklch(97% 0.025 75)", borderRadius: 12, border: "1px solid oklch(90% 0.04 75)" }}>
          <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-mid)", margin: 0 }}>
            Dúvidas? Entre em contato: <strong>[contato@levbeauty.com.br]</strong>
          </p>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 32px", textAlign: "center", background: "white" }}>
        <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: 0 }}>
          © {new Date().getFullYear()} LevBeauty · Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
