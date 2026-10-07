# Controle Dois Tarefas

Quadro de tarefas estilo Trello, projeto separado do painel administrativo (módulo à parte do Controle Dois). Usa a mesma API e o mesmo login do Controle Dois; cada empresa vê os próprios quadros.

- **Quadros**: vários por empresa, com fundo colorido. O quadro "Tarefas" é o padrão e é o mesmo que aparece em Tarefas no ERP.
- **Listas e cartões**: criar, renomear, arquivar; arrastar cartões entre listas e reordenar as listas.
- **Cartão**: descrição, etiquetas coloridas, datas (início e entrega, com marcação de concluído), checklists com progresso, membros, anexos, capa (cor ou imagem), comentários e histórico de atividade.
- **Filtros** por palavra-chave e etiqueta.

```bash
npm install
npm run dev     # http://localhost:5178
npm run build
```

`VITE_API_URL` aponta a API (padrão `http://localhost:3333`; produção em `.env.production`). Publicar em `task.controledois.com.br` (o CORS da API já aceita esse domínio).
