
// ======================================
// ECOFIX - CALCULADORA DE ECONOMIA
// ======================================

// Preços fictícios para demonstração
const modelosConvencionais = [0.80, 1.20];
const modelosReutilizaveis = [3.50, 5.00];

// Elementos da página
const cadastro = document.querySelector(".cadastro");
const campos = cadastro.querySelectorAll("input");
const seletores = cadastro.querySelectorAll("select");
const botao = cadastro.querySelector("button");

const indicadores = document.querySelectorAll(
    ".indicadores .card p"
);

const listaLocais = document.querySelector(".locais");

// Configurações iniciais
let producaoDiaria = 30;
let diasMes = 22;
let mesesAno = 12;

let substituicoes = [];

// Identificação dos dados salvos
const CHAVE_ECOFIX = "ecofix_dados_v1";

// Recuperar dados anteriores
function carregarDados() {
    try {
        const dados = JSON.parse(
            localStorage.getItem(CHAVE_ECOFIX)
        );

        if (dados) {
            substituicoes = dados.substituicoes || [];
            producaoDiaria = dados.producaoDiaria ?? 30;
            diasMes = dados.diasMes ?? 22;
            mesesAno = dados.mesesAno ?? 12;
        }
    } catch (erro) {
        console.log("Erro ao recuperar dados:", erro);
    }
}

// Salvar informações automaticamente
function salvarDados() {
    const dados = {
        substituicoes,
        producaoDiaria,
        diasMes,
        mesesAno
    };

    localStorage.setItem(
        CHAVE_ECOFIX,
        JSON.stringify(dados)
    );
}

// Carregar informações ao abrir o site
carregarDados();


// Criar campo de ciclos de reutilização
const labelCiclos = document.createElement("label");
labelCiclos.textContent = "Ciclos estimados de reutilização";

const campoCiclos = document.createElement("input");
campoCiclos.type = "number";
campoCiclos.min = "1";
campoCiclos.value = "20";

labelCiclos.appendChild(campoCiclos);
cadastro.insertBefore(labelCiclos, botao);

// Criar campo de produção diária
const configuracao = document.createElement("section");
configuracao.className = "cadastro";

configuracao.innerHTML = `
    <h2>Produção</h2>
    <label>Caminhões produzidos por dia</label>
    <input id="producao" type="number" min="0" value="30">

    <label>Dias produtivos por mês</label>
    <input id="diasMes" type="number" min="0" max="31" value="22">

    <label>Meses produtivos por ano</label>
    <input id="mesesAno" type="number" min="0" max="12" value="12">
`;

cadastro.parentNode.insertBefore(configuracao, cadastro);
configuracao.querySelector("#producao").value = producaoDiaria;
configuracao.querySelector("#diasMes").value = diasMes;
configuracao.querySelector("#mesesAno").value = mesesAno;

// Criar botão de exportação
const botaoExportar = document.createElement("button");
botaoExportar.textContent = "Exportar planilha CSV";
botaoExportar.type = "button";

cadastro.appendChild(botaoExportar);

// Formatação em reais
function formatarDinheiro(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// Calcular economia por caminhão
function calcularEconomia(item) {
    const custoConvencional =
        item.quantidade * item.precoConvencional;

    const custoReutilizavel =
        item.quantidade *
        (item.precoReutilizavel / item.ciclos);

    return custoConvencional - custoReutilizavel;
}

// Atualizar os indicadores
function atualizarPainel() {
    salvarDados();
    const economiaTotal = substituicoes.reduce(
        (total, item) => total + calcularEconomia(item),
        0
    );

    const economiaDiaria =
        economiaTotal * producaoDiaria;

    const economiaMensal =
        economiaDiaria * diasMes;

    const economiaAnual =
        economiaMensal * mesesAno;

    indicadores[0].textContent =
        formatarDinheiro(economiaTotal);

    indicadores[1].textContent =
        formatarDinheiro(economiaDiaria);

    indicadores[2].textContent =
        formatarDinheiro(economiaMensal);

    indicadores[3].textContent =
        formatarDinheiro(economiaAnual);

    atualizarLocais();
}

// Mostrar locais cadastrados

// Mostrar locais cadastrados
function atualizarLocais() {
    listaLocais.innerHTML = "<h2>Locais cadastrados</h2>";

    if (substituicoes.length === 0) {
        listaLocais.innerHTML +=
            "<p>Nenhuma substituição cadastrada.</p>";
        return;
    }

    substituicoes.forEach((item, indice) => {
        const economia = calcularEconomia(item);

        const linha = document.createElement("div");

        const nome = document.createElement("strong");
        nome.textContent = item.local;

        const detalhe = document.createElement("p");
        detalhe.textContent =
            "Quantidade: " + item.quantidade +
            " | Ciclos: " + item.ciclos +
            " | Economia por caminhão: " +
            formatarDinheiro(economia);

        // Botão editar
        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.type = "button";

        editar.onclick = function () {
            const novoLocal = prompt(
                "Nome do local:",
                item.local
            );

            if (novoLocal === null) return;

            const novaQuantidade = prompt(
                "Nova quantidade:",
                item.quantidade
            );

            if (novaQuantidade === null) return;

            const novosCiclos = prompt(
                "Novos ciclos de reutilização:",
                item.ciclos
            );

            if (novosCiclos === null) return;

            const quantidade = Number(novaQuantidade);
            const ciclos = Number(novosCiclos);

            if (
                !novoLocal.trim() ||
                !Number.isInteger(quantidade) ||
                quantidade <= 0 ||
                !Number.isInteger(ciclos) ||
                ciclos <= 0
            ) {
                alert("Confira os dados informados.");
                return;
            }

            substituicoes[indice] = {
                ...item,
                local: novoLocal.trim(),
                quantidade: quantidade,
                ciclos: ciclos
            };

            atualizarPainel();
        };

        // Botão remover
        const remover = document.createElement("button");
        remover.textContent = "Remover";
        remover.type = "button";

        remover.onclick = function () {
            const confirmar = confirm(
                "Deseja realmente remover este cadastro?"
            );

            if (confirmar) {
                substituicoes.splice(indice, 1);
                atualizarPainel();
            }
        };

        linha.append(nome, detalhe, editar, remover);
        listaLocais.appendChild(linha);
    });
}

// Adicionar substituição
botao.addEventListener("click", function () {
    const local = campos[0].value.trim();
    const quantidade = Number(campos[1].value);
    const ciclos = Number(campoCiclos.value);

    const modeloConvencional = seletores[0].selectedIndex - 1;
    const modeloReutilizavel = seletores[1].selectedIndex - 1;

    if (
        !local ||
        !Number.isInteger(quantidade) ||
        quantidade <= 0 ||
        !Number.isInteger(ciclos) ||
        ciclos <= 0 ||
        modeloConvencional < 0 ||
        modeloReutilizavel < 0
    ) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    const item = {
        local: local,
        quantidade: quantidade,
        ciclos: ciclos,
        precoConvencional:
            modelosConvencionais[modeloConvencional],
        precoReutilizavel:
            modelosReutilizaveis[modeloReutilizavel]
    };

    substituicoes.push(item);

    atualizarPainel();

    campos[0].value = "";
    campos[1].value = "";
    seletores[0].selectedIndex = 0;
    seletores[1].selectedIndex = 0;
    campoCiclos.value = 20;
});

// Alterar produção
document.querySelector("#producao")
    .addEventListener("input", function () {
        producaoDiaria = Math.max(0, Number(this.value) || 0);
        atualizarPainel();
    });

document.querySelector("#diasMes")
    .addEventListener("input", function () {
        diasMes = Math.max(0, Number(this.value) || 0);
        atualizarPainel();
    });

document.querySelector("#mesesAno")
    .addEventListener("input", function () {
        mesesAno = Math.max(0, Number(this.value) || 0);
        atualizarPainel();
    });

// Exportar relatório CSV
botaoExportar.addEventListener("click", function () {
    const linhas = [
        ["Local", "Quantidade", "Ciclos", "Economia por caminhão"]
    ];

    substituicoes.forEach(item => {
        linhas.push([
            item.local,
            item.quantidade,
            item.ciclos,
            calcularEconomia(item).toFixed(2)
        ]);
    });

    const conteudo = linhas
        .map(linha => linha.join(";"))
        .join("\n");

    const arquivo = new Blob(
        ["\uFEFF" + conteudo],
        { type: "text/csv;charset=utf-8;" }
    );

    const link = document.createElement("a");
    link.href = URL.createObjectURL(arquivo);
    link.download = "relatorio-ecofix.csv";
    link.click();

    URL.revokeObjectURL(link.href);
});

// Iniciar painel
atualizarPainel();


