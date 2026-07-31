# Luna Cosméticos — Sistema de Gestão

Sistema de gestão comercial e de tráfego da Luna Cosméticos.

## Estrutura do Projeto

```
luna_cosmeticos/
├── backend/                  → API local (roda 24h no PC servidor)
├── documentacao/             → Arquitetura e documentação geral
├── frontend/                 → Reservado para arquitetura futura
├── lixeira/                  → Scripts descartados após uso único
├── portal_luna_cosmeticos/   → App instalável (notebook da loja)
├── prompts/                  → Prompts de referência (não versionados)
├── scripts_permanentes/      → Scripts git e automações fixas
└── scripts_temporarios/      → Scripts em validação
```

## Scripts Disponíveis

Todos os scripts estão em `scripts_permanentes/`:

| Script | Uso |
|---|---|
| `commit.bat "mensagem"` | Faz commit com mensagem |
| `push.bat` | Envia para origin/main |
| `commit-push.bat "mensagem"` | Commit + push em um comando |
| `amend.bat` ou `amend.bat "msg"` | Corrige último commit |
| `pull.bat` | Sincroniza com remoto |
| `status.bat` | Mostra status e últimos commits |

## Repositório

[github.com/PixelboxDesign/Gestao_de_trafego](https://github.com/PixelboxDesign/Gestao_de_trafego)

## Arquitetura

Ver `documentacao/arquitetura.md`
