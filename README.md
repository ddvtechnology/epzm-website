# Escola Presbiteriana Zenaide Magalhães — Website

Recriação da homepage institucional, desenvolvida com HTML5, CSS3, JavaScript Vanilla, Bootstrap 5, Bootstrap Icons e AOS (Animate On Scroll).

## Estrutura do projeto

```
/
├── index.html
├── css/
│   ├── fonts.css        → @font-face do Poppins (self-hosted)
│   ├── style.css         → variáveis, componentes e layout principal
│   └── responsive.css    → breakpoints (tablet e mobile)
├── js/
│   └── script.js         → navbar dinâmica, scrollspy, AOS init, offcanvas
├── assets/
│   ├── logo/logo.png     → logotipo oficial (fundo removido/transparente)
│   ├── vendor/           → Bootstrap 5, Bootstrap Icons, AOS e fontes Poppins hospedados localmente (não dependem de internet/CDN)
│   ├── img/
│   └── icons/
└── README.md
```

## Como usar

Basta abrir `index.html` em qualquer navegador moderno — não há build step **e não é necessário estar online**: todas as bibliotecas (Bootstrap, Bootstrap Icons, AOS, fontes Poppins) estão hospedadas localmente em `assets/vendor/`.

Para servir localmente com um pequeno servidor HTTP (recomendado para testar caminhos relativos corretamente):

```bash
# Python
python3 -m http.server 8000

# ou Node
npx serve .
```

Depois acesse `http://localhost:8000`.

## Changelog — ajustes de responsividade (última revisão)

- **Bug crítico corrigido**: o menu completo do desktop (Início, A Escola, Segmentos, Proposta Pedagógica, Sistema Mackenzie, Eventos, Equipe, Contato) colidia/sobrepunha o botão "Matrículas Abertas" em telas entre ~1200px e ~1450px de largura (notebooks comuns). O menu foi reorganizado (espaçamentos, fonte e breakpoint de exibição) para caber com folga em qualquer largura de desktop, do notebook de 13" a monitores ultrawide.
- Adicionado `overflow-x: hidden` no `html`/`body` para eliminar um scroll horizontal indesejado causado pelo menu mobile (offcanvas) fora da tela.
- Bibliotecas externas (Bootstrap, Bootstrap Icons, AOS, Google Fonts) passaram a ser **hospedadas localmente** em `assets/vendor/`, eliminando qualquer falha de carregamento por bloqueio de CDN, adblock ou perda de conexão — o site funciona 100% offline após o primeiro download.
- Testado programaticamente (Playwright/Chromium) em 320px, 360px, 375px, 390px, 414px, 480px, 600px, 768px, 834px, 900px, 1024px, 1100px, 1200px, 1280px, 1366px, 1400px, 1440px, 1600px e 1920px — sem overflow horizontal ou sobreposição de elementos em nenhuma largura.

## Design System

| Token | Valor |
|---|---|
| Primária | `#0F5A45` |
| Secundária | `#176B55` |
| Branco | `#FFFFFF` |
| Cinza claro | `#F5F5F5` |
| Texto | `#2D2D2D` |
| Texto secundário | `#666666` |
| Bordas | `#E5E5E5` |

Tipografia: **Poppins** (300 / 400 / 500 / 600 / 700), via Google Fonts.

Container máximo: `1320px`.

## Seções implementadas

- Topbar (boas-vindas, portais, telefone, redes sociais)
- Navbar fixa com efeito de encolhimento + blur ao rolar a página, dropdowns e menu mobile via Offcanvas do Bootstrap
- Hero com título institucional, dois CTAs e card de versículo bíblico sobreposto à imagem
- Diferenciais (4 cards com ícone, título e descrição)
- Quem Somos (texto + imagem da fachada + estatísticas: 650+ alunos, 45+ professores, +20 anos, 100% compromisso)
- Sistema Mackenzie de Ensino (card de destaque)
- Segmentos (5 cards: Educação Infantil, Fundamental I, Fundamental II, Sistema Mackenzie, Portal Sponte)
- CTA final de matrículas
- Footer institucional com contato, links e redes sociais

## Sobre as imagens

Este ambiente não possui uma ferramenta de geração de imagens por IA integrada, então as 3 imagens abaixo foram substituídas por **ilustrações vetoriais (SVG) originais** no estilo e paleta da marca, direto no `index.html`. Para deixar o site com fotos reais, gere as imagens com o **Google Gemini** (ou Imagen) usando os prompts abaixo e siga o passo a passo de substituição.

### 1) Imagem do Hero (crianças / alunos)
**Prompt sugerido para o Gemini:**
> Fotografia realista e calorosa de três crianças brasileiras de escola, entre 8 e 11 anos, sorrindo e se abraçando, vestindo uniforme escolar branco com detalhes verde-escuro, dentro de uma sala de aula clara e moderna, luz natural suave, fundo levemente desfocado com estantes de livros, estilo editorial de fotografia institucional, cores predominantes verde (#0F5A45) e branco, proporção 4:3.4, alta qualidade, sem texto, sem marca d'água.

**Onde substituir:** abra `index.html`, localize o comentário `<!-- Illustrative placeholder graphic (royalty-free style) representing students -->` dentro da seção `<section class="hero" ...>`. Apague todo o bloco `<svg ...>...</svg>` logo abaixo do comentário e no lugar coloque:
```html
<img src="assets/img/hero-alunos.jpg" alt="Alunos sorrindo em sala de aula" loading="lazy">
```
Salve a foto gerada em `assets/img/hero-alunos.jpg`. O contêiner `.hero-visual-frame` já cuida do arredondamento, sombra e proporção (`aspect-ratio`), então a imagem se ajusta automaticamente com `object-fit: cover` (adicione `style="width:100%;height:100%;object-fit:cover;"` na tag `<img>` para garantir o recorte correto).

### 2) Fachada da escola (seção "Quem Somos")
**Prompt sugerido para o Gemini:**
> Fotografia arquitetônica realista da fachada de uma escola particular brasileira de porte médio, dois andares, fachada branca e verde-escuro (#0F5A45), grandes janelas, entrada com letreiro, palmeiras nas laterais, céu azul claro com poucas nuvens, luz do fim de manhã, estilo fotografia institucional/imobiliária, proporção 500:420, alta qualidade, sem pessoas, sem texto.

**Onde substituir:** no `index.html`, localize `<div class="quem-somos-image">` (dentro da `<section class="quem-somos" id="a-escola">`). Remova o `<svg>...</svg>` interno e insira:
```html
<img src="assets/img/fachada-escola.jpg" alt="Fachada da Escola Presbiteriana Zenaide Magalhães" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
```
Salve o arquivo em `assets/img/fachada-escola.jpg`.

### 3) Ilustração/foto de estudante (CTA final "Matrículas Abertas")
**Prompt sugerido para o Gemini:**
> Fotografia realista de uma criança brasileira de escola, cerca de 9 anos, uniforme branco com gola verde-escuro, mochila escolar, sorrindo, em pé, fundo verde sólido (#0F5A45) ou removível, iluminação de estúdio suave, foto de corpo inteiro ou 3/4, estilo institucional, proporção retrato 220:260, alta qualidade, sem texto.

**Onde substituir:** localize `<div class="cta-visual">` dentro da `<section class="cta-final" id="matriculas">`. Remova o `<svg>...</svg>` e insira:
```html
<img src="assets/img/estudante-cta.png" alt="Estudante da escola" loading="lazy" style="width:220px;height:auto;">
```
Se a imagem gerada tiver fundo transparente (PNG), o resultado ficará idêntico ao card verde do CTA. Salve em `assets/img/estudante-cta.png`.

> Dica: depois de gerar as 3 imagens, salve-as dentro da pasta `assets/img/` (que já existe no projeto) exatamente com os nomes de arquivo indicados acima — assim os caminhos do HTML já funcionam sem precisar editar mais nada além do que foi mostrado.

## Acessibilidade e performance

- HTML semântico (`header`, `nav`, `main`, `section`, `footer`)
- Textos alternativos em imagens e ilustrações
- Foco visível em links e botões (`:focus-visible`)
- Respeita `prefers-reduced-motion`
- Animações via AOS com `once: true` (não repetem a cada scroll)
- CSS organizado por seção, com variáveis centralizadas em `:root`

## Personalização rápida

- Cores: edite as variáveis em `css/style.css` (`:root`)
- Textos: edite diretamente no `index.html`
- Links de redes sociais, telefone e e-mail: procure por `href="#"` no `index.html` e substitua pelos links reais
- WhatsApp: o botão "Agende uma Visita" já aponta para `https://wa.me/558799712427` — atualize o número se necessário
