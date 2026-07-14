# 📋 Como Usar a Rota /api/todos-clientes

## 🎯 O Que Esta Rota Faz

Busca **ABSOLUTAMENTE TODOS OS CLIENTES** de **TODAS AS TABELAS** do database!

Não deixa NENHUM cliente de fora. Varre:
- ✅ Bling E-commerce (pedidos, NFe, detalhes)
- ✅ Bling Distribuição (pedidos, NFe, detalhes)
- ✅ Tray E-commerce (clientes, deltas, pedidos)
- ✅ Tray Distribuição (clientes, pedidos)
- ✅ Tray Customers (attributes, address)
- ✅ Pedidos Tray (detalhes, itens)

**Total:** 15+ tabelas diferentes!

---

## 🚀 Como Acessar

### **Endpoint 1: Todos os Clientes (com duplicatas)**

```
GET https://gestao-de-trafego.onrender.com/api/todos-clientes
```

**Retorna:**
```json
{
  "total": 5234,
  "clientes": [
    {
      "nome": "João Silva",
      "fonte": "Bling E-commerce - Pedidos",
      "email": null,
      "telefone": null,
      "cidade": null,
      "estado": null
    },
    {
      "nome": "João Silva",
      "fonte": "Tray E-commerce",
      "email": "joao@example.com",
      "telefone": "11999999999",
      "cidade": "São Paulo",
      "estado": "SP"
    }
  ],
  "resumo": {
    "totalClientes": 5234,
    "porFonte": {
      "Bling E-commerce - Pedidos": 1500,
      "Tray E-commerce": 2000,
      "Bling Distribuição - Pedidos": 800
    },
    "fontes": 15
  }
}
```

### **Endpoint 2: Clientes Únicos (sem duplicatas)**

```
GET https://gestao-de-trafego.onrender.com/api/todos-clientes/sem-duplicatas
```

**Retorna:**
```json
{
  "total": 3500,
  "clientes": [
    {
      "nome": "João Silva",
      "total_fontes": 3,
      "fontes": "Bling E-commerce | Tray E-commerce | Tray Customers",
      "email": "joao@example.com",
      "telefone": "11999999999",
      "cidade": "São Paulo",
      "estado": "SP"
    }
  ]
}
```

---

## 📊 Tabelas Varridas

### **Bling E-commerce (6 fontes)**
1. `bling_pedidos_venda_ecommerce` → campo `contato_nome`
2. `bling_pedidos_venda_detalhes_ecommerce` → campo `contato_nome`
3. `bling_nfe_saida_detalhes_ecommerce` → campo `contato_nome`

### **Bling Distribuição (6 fontes)**
4. `bling_pedidos_venda_distribuicao` → campo `contato_nome`
5. `bling_pedidos_venda_detalhes_distribuicao` → campo `contato_nome`
6. `bling_nfe_saida_detalhes_distribuicao` → campo `contato_nome`

### **Tray E-commerce (9 fontes)**
7. `clientes_tray_ecommerce` → campo `name`
8. `clientes_tray_ecommerce_deltas` → campo `name`
9. `clientes_tray_ecommerce_deltas_fixed` → campo `name`
10. `pedidos_ecommerce_tray` → campo `customer_name`
11. `tray_ecommerce_pedidos_detalhes` → campo `customer_name`
12. `detalhes_pedidos_ecommerce_tray` → campo `customer_name`

### **Tray Distribuição (3 fontes)**
13. `clientes_tray_distribuicao` → campo `name`
14. `pedidos_distribuicao_tray` → campo `customer_name`

### **Tray Customers (2 fontes)**
15. `tray_customers_attributesdist` → campos `first_name` + `last_name`
16. `tray_customers_attributes` → campos `first_name` + `last_name`

---

## 💡 Filtros Aplicados

A query **remove automaticamente**:
- ❌ Valores NULL
- ❌ Strings vazias (`''`)
- ❌ Nomes com menos de 3 caracteres
- ❌ Espaços extras (usa `TRIM()`)

---

## 🖥️ Como Usar no Frontend

### **Opção 1: Lista Simples (com React)**

```jsx
import { useState, useEffect } from 'react';

function TodosClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://gestao-de-trafego.onrender.com/api/todos-clientes')
      .then(res => res.json())
      .then(data => {
        setClientes(data.clientes);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1>Todos os Clientes ({clientes.length})</h1>
      <ul>
        {clientes.map((cliente, index) => (
          <li key={index}>
            <strong>{cliente.nome}</strong> - {cliente.fonte}
            {cliente.email && ` - ${cliente.email}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### **Opção 2: Tabela Ordenável**

```jsx
import DataTable from 'react-data-table-component';

function TabelaClientes() {
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    fetch('https://gestao-de-trafego.onrender.com/api/todos-clientes/sem-duplicatas')
      .then(res => res.json())
      .then(data => setClientes(data.clientes));
  }, []);

  const columns = [
    { name: 'Nome', selector: row => row.nome, sortable: true },
    { name: 'Fontes', selector: row => row.fontes, sortable: true },
    { name: 'Email', selector: row => row.email, sortable: true },
    { name: 'Cidade', selector: row => row.cidade, sortable: true },
    { name: 'Estado', selector: row => row.estado, sortable: true },
  ];

  return (
    <DataTable
      title="Todos os Clientes Únicos"
      columns={columns}
      data={clientes}
      pagination
      highlightOnHover
    />
  );
}
```

---

## ⚡ Performance

- **Query pode ser lenta** (varre 15+ tabelas)
- **Primeira chamada:** ~10-30 segundos
- **Recomendação:** Usar loading spinner
- **Alternativa:** Implementar paginação/busca

---

## 🔧 Troubleshooting

### **Erro 500 - Timeout**
A query é pesada. Aumente timeout do Render ou adicione índices nas tabelas.

### **Clientes Duplicados**
Use o endpoint `/sem-duplicatas` para agrupar por nome.

### **Campos NULL**
Algumas tabelas não têm email/telefone. Use `|| 'N/A'` no frontend.

---

## 📝 Próximos Passos

1. ✅ Testar endpoint no Postman/Insomnia
2. ✅ Criar página no frontend
3. ✅ Adicionar busca/filtros
4. ✅ Exportar para Excel/CSV

---

📅 Criado: 14/07/2026  
🔄 Rota: `/api/todos-clientes`  
✅ Busca: 15+ tabelas diferentes!
