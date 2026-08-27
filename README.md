# Escola Presbiteriana Zenaide Magalhães — Website Institucional

Website institucional da Escola Presbiteriana Zenaide Magalhães, desenvolvido com HTML5, CSS3, JavaScript Vanilla, Bootstrap 5, Bootstrap Icons e AOS (Animate On Scroll).

---

## 📁 Estrutura do Projeto

```
/
├── index.html            → Página principal institucional
├── equipe.html           → Página da equipe pedagógica e administrativa
├── css/
│   ├── fonts.css         → Fontes Poppins (self-hosted)
│   ├── style.css         → Variáveis, componentes e estrutura principal
│   └── responsive.css    → Regras e breakpoints responsivos
├── js/
│   └── script.js         → Lógica da navbar, animações AOS e interações
├── assets/
│   ├── logo/             → Logotipo oficial da instituição
│   ├── img/              → Imagens institucionais e fotos da equipe
│   └── vendor/           → Dependências locais (Bootstrap 5, Icons, AOS)
└── README.md
```

---

## 🚀 Execução Local

Todas as bibliotecas e fontes estão hospedadas localmente na pasta `assets/vendor/`. Não há necessidade de build step ou conexão com a internet.

Para servir a aplicação via servidor HTTP local:

```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve .
```

Acesse no navegador: `http://localhost:8000`.

---

## 🎨 Guia de Cores & Design System

| Elemento | Código Cor | Aplicação |
|---|---|---|
| Verde Presbiteriano | `#0F5A45` | Cor primária institucional |
| Verde Secundário | `#176B55` | Gradientes e destaques |
| Portal do Estudante | `#F59E0B` | Destaque na topbar |
| Portal do Professor | `#280047` | Destaque na topbar |
| Fundo / Texto Claro | `#FFFFFF` | Áreas de contraste |
| Texto Principal | `#2D2D2D` | Tipografia institucional |

Tipografia principal: **Poppins** (Google Fonts / self-hosted).

---

## 📄 Páginas & Funcionalidades

- **Página Inicial (`index.html`)**:
  - Barra superior institucional (Topbar) com acessos aos portais e atendimento via WhatsApp.
  - Menu principal fixo (Header Sticky) com navegação fluida e menu mobile offcanvas.
  - Banner principal (Hero) com apresentação institucional e passagem bíblica (Provérbios 22:6).
  - Seções de Proposta Pedagógica, História, Estatísticas, Segmentos e Matrículas.
  - Seção em destaque de apresentação da Equipe com direcionamento.
  - Rodapé completo com localização, contatos e redes sociais.

- **Página de Equipe (`equipe.html`)**:
  - Listagem completa dos professores, coordenadores e gestores.
  - Filtros dinâmicos por categoria (*Direção & Gestão*, *Coordenação Pedagógica*, *Corpo Docente*).

---

## 📱 Suporte a Dispositivos Móveis

- 100% responsivo para smartphones, tablets e computadores.
- Layouts de grades fluidos adaptados para toque mobile.
- Trava de segurança anti-transbordo horizontal (`overflow-x: hidden`).
