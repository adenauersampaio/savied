# Savied - Editor de Vídeo Online (Inspirado no CapCut)

Um editor de vídeo web moderno, elegante, rápido e fácil de usar, inspirado na interface e fluxo de trabalho do **CapCut Online**. Focado na simplicidade para **cortes (splits), aparas (trims), emendas (splices)** e **efeitos de transição suaves**, com opções completas de exportação em **9:16 (Vertical)** e **16:9 (Horizontal)**.

---

## 🚀 Principais Funcionalidades

### 1. Cortes e Emendas Simples e Precisos
- **Dividir no Cursor (`S`)**: Corte instantâneo de qualquer clipe na posição exata da agulha de reprodução (playhead).
- **Aparar com Alças (Trim)**: Clique e arraste as extremidades esquerda ou direita de cada clipe na linha do tempo para ajustar com precisão o início e o fim.
- **Emendas Contínuas (Sequenciamento)**: Junte múltiplos vídeos em sequência na linha do tempo, com reordenação fácil (Mover para esquerda / direita).
- **Duplicar e Excluir**: Duplique clipes com 1 clique ou remova usando o botão de lixeira ou a tecla `Delete` / `Backspace`.
- **Desfazer e Refazer (`Ctrl + Z` / `Ctrl + Y`)**: Histórico de ações completo para editar com tranquilidade.

### 2. Efeitos de Transição Simples
- **Ícone de Transição Interativo (`⧓`)**: Clique no marcador entre quaisquer dois clipes na timeline para escolher a transição.
- Efeitos disponíveis:
  - **Dissolver (Crossfade)**: Transição suave e clássica.
  - **Fade para Preto**: Mergulho dramático no escuro.
  - **Fade para Branco**: Clarão de luz vívido.
  - **Deslizar para Esquerda**: Empurrão dinâmico lateral.
  - **Deslizar para Direita**: Empurrão dinâmico inverso.
  - **Varredura (Wipe)**: Corte deslizante progressivo.
  - **Zoom In**: Transição com aproximação acelerada.
- Controle de duração da transição com controle deslizante (ex: 0.5s, 0.8s, 1.2s).
- Botão "Aplicar em Todos os Cortes" para padronizar todo o projeto em 1 clique.

### 3. Formatos de Vídeo e Exportação (Vertical 9:16 e Horizontal 16:9)
- **Alternador Rápido no Topo**:
  - **16:9 Horizontal**: Otimizado para YouTube, TVs e computadores (1920x1080 / 1280x720).
  - **9:16 Vertical**: Otimizado para TikTok, Instagram Reels, YouTube Shorts e Stories (1080x1920 / 720x1280).
- **Modos de Enquadramento Inteligentes**:
  - **Ajustar (Letterbox com Fundo Desfocado)**: O efeito clássico do CapCut que desfoca o vídeo no fundo para preencher o formato sem cortes.
  - **Preencher (Cover / Zoom)**: Preenche toda a tela da proporção escolhida.
- **Renderização Rápida com FFmpeg Nativo**:
  - Exportação em MP4 (H.264 + AAC) com sincronização exata de áudio e vídeo e filtros de transição `xfade`.
  - Barra de progresso em tempo real com porcentagem.
  - Player para pré-visualizar o vídeo renderizado e botão direto para download (`.mp4`).

### 4. Linha do Tempo Multi-Faixas e Gestão de Faixas
- **Múltiplas Faixas de Vídeo e Áudio**: Suporte a ilimitadas faixas de vídeo e áudio.
- **Menu de Contexto com Botão Direito**: Clique com o botão direito sobre qualquer faixa para adicionar nova faixa de vídeo/áudio, renomear ou excluir.
- **Arrastar e Soltar Completo (Drag & Drop)**:
  - Arraste arquivos da Biblioteca diretamente para qualquer faixa na timeline (com linha indicadora de soltura animada).
  - Reordene clipes na timeline apenas arrastando-os para a esquerda ou direita.
  - Arraste clipes de vídeo para uma faixa de áudio para separar/desvincular o áudio automaticamente na posição desejada.
  - Arraste clipes entre faixas de vídeo e entre faixas de áudio.
- **Inserção Flexível**: Opções diretas para inserir mídia no início da timeline (1º lugar), na agulha de reprodução (playhead) ou no final.
- **Botões Rápidos na Barra da Linha do Tempo**: `Início` (|<<), `Esquerda` (<), `Direita` (>), `Fim` (>>|), `Dividir` (S), `Separar Áudio`, `Duplicar` e `Excluir`.

### 5. Biblioteca de Mídia do Projeto e Painéis Redimensionáveis
- **Upload Múltiplo Simultâneo**: Selecione dezenas de arquivos de uma vez (ou arraste para o depósito de mídia) com suporte a Vídeos, Áudios e Imagens.
- **Painéis Ajustáveis por Arrasto**: Ajuste a largura da barra lateral e a altura da timeline arrastando as bordas divisorias, com botão de "Layout Padrão" no cabeçalho para restaurar instantaneamente.
- **Botão "Novo Projeto"**: Inicie um novo projeto do zero com confirmação de segurança.

### 6. Filtros e Áudio
- Presets de cor: Normal, Cinema, Retrô/Vintage, Preto & Branco, Cores Vivas, Quente e Frio.
- Controles deslizantes de Brilho, Contraste e Saturação.
- Volume individual por clipe (0% a 200%) e botão de Mudo.

---

## ⌨️ Atalhos do Teclado

| Tecla | Ação |
| :--- | :--- |
| `Espaço` | Reproduzir / Pausar |
| `S` | Dividir / Cortar clipe no cursor |
| `Delete` / `Backspace` | Excluir clipe selecionado |
| `←` / `→` | Voltar / Avançar 0.1 segundo |
| `Home` / `End` | Ir para o início / fim da linha do tempo |
| `Ctrl + Z` | Desfazer alteração |
| `Ctrl + Y` | Refazer alteração |

---

## 🛠️ Como Executar

### 1. Iniciar o App (Frontend + Backend)
Execute no terminal:
```bash
npm run dev
```
O aplicativo estará disponível em: **`http://localhost:5173`**

### 2. Scripts Disponíveis
- `npm run dev`: Inicia o backend Express (porta 3001) e o frontend Vite (porta 5173) simultaneamente.
- `npm run build`: Compila a aplicação TypeScript e gera os arquivos estáticos de produção.
- `npm run server`: Inicia apenas o servidor backend com suporte a FFmpeg.
- `npm run client`: Inicia apenas o servidor de desenvolvimento do Vite.
