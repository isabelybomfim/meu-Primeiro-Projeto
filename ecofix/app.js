// ======================================
// ECOFIX - CALCULADORA DE ECONOMIA (v2)
// ======================================

// Preços informados para o EcoFix
const modelosConvencionais = [1.03];
const modelosReutilizaveis = [5.75];

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
let producaoDiaria = 88;
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
            producaoDiaria = dados.producaoDiaria ?? 88;
            diasMes = dados.diasMes ?? 22;
            mesesAno = dados.mesesAno ?? 12;

            // Migração única: substitui os preços antigos de demonstração
            // pelos preços informados, sem apagar locais, quantidades ou ciclos.
            if ((dados.versaoDados || 1) < 2) {
                // Atualiza também o parâmetro antigo de 30 para os 88 informados.
                producaoDiaria = 88;

                substituicoes = substituicoes.map(item => ({
                    ...item,
                    nomeConvencional: "Fita Tyton convencional",
                    nomeReutilizavel: "Fita reutilizável",
                    precoConvencional: modelosConvencionais[0],
                    precoReutilizavel: modelosReutilizaveis[0]
                }));
            }
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
        mesesAno,
        versaoDados: 2
    };

    try {
        localStorage.setItem(
            CHAVE_ECOFIX,
            JSON.stringify(dados)
        );
    } catch (erro) {
        console.log("Não foi possível salvar os dados:", erro);
    }
}

// Carregar informações ao abrir o site
carregarDados();


// Criar campo de ciclos de reutilização
const labelCiclos = document.createElement("label");
labelCiclos.textContent = "Ciclos estimados de reutilização (ajustável)";

const campoCiclos = document.createElement("input");
campoCiclos.type = "number";
campoCiclos.min = "1";
campoCiclos.value = "20"; // estimativa inicial, não é dado operacional confirmado

labelCiclos.appendChild(campoCiclos);
cadastro.insertBefore(labelCiclos, botao);

// Criar campo de produção diária
const configuracao = document.createElement("section");
configuracao.className = "cadastro";

configuracao.innerHTML = `
    <h2>Produção</h2>

    <label>Caminhões produzidos por dia</label>
    <input id="producao" type="number"
        min="0" step="1" value="88">

    <label>Dias produtivos por mês</label>
    <input id="diasMes" type="number"
        min="0" max="31" step="1" value="22">

    <label>Meses produtivos por ano</label>
    <input id="mesesAno" type="number"
        min="0" max="12" step="1" value="12">
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

// ----- Cálculos -----

// Custo convencional evitado por caminhão
function custoConvencional(item) {
    return item.quantidade * item.precoConvencional;
}

// Custo amortizado da reutilizável por caminhão
function custoAmortizado(item, ciclos = item.ciclos) {
    return item.quantidade * (item.precoReutilizavel / ciclos);
}

// Economia estimada por caminhão
function calcularEconomia(item, ciclos = item.ciclos) {
    return custoConvencional(item) - custoAmortizado(item, ciclos);
}

// Investimento inicial (quantidade × preço reutilizável)
function investimentoInicial(item) {
    return item.quantidade * item.precoReutilizavel;
}

// Ciclos mínimos para a reutilizável empatar com a convencional
function ciclosEquilibrio(item) {
    return item.precoReutilizavel / item.precoConvencional;
}

// Quantidade inteira mínima para gerar economia positiva
function ciclosMinimosEconomia(item) {
    return Math.floor(ciclosEquilibrio(item)) + 1;
}

// Economia anual para um fator aplicado aos ciclos (cenários)
function economiaAnualCenario(fator) {
    const porCaminhao = substituicoes.reduce(
        (total, item) => {
            const ciclos = Math.max(1, Math.round(item.ciclos * fator));
            return total + calcularEconomia(item, ciclos);
        },
        0
    );

    return porCaminhao * producaoDiaria * diasMes * mesesAno;
}

function atualizarAnalise() {}
function atualizarGraficos() {}

function atualizarLocais() {
    listaLocais.innerHTML = "<h2>Locais cadastrados</h2>";

    if (substituicoes.length === 0) {
        listaLocais.innerHTML +=
            "<p>Nenhuma substituição cadastrada.</p>";
        return;
    }

    substituicoes.forEach((item, indice) => {
        const economia = calcularEconomia(item);
        const equilibrio = ciclosEquilibrio(item);

        const linha = document.createElement("div");
        linha.className = "item-local";

        const nome = document.createElement("strong");
        nome.textContent = item.local;

        const detalhe = document.createElement("p");
        detalhe.textContent =
            "Produto convencional: " + item.nomeConvencional +
            " | Produto reutilizável: " + item.nomeReutilizavel +
            " | Quantidade: " + item.quantidade +
            " | Ciclos: " + item.ciclos +
            " | Economia por caminhão: " +
                formatarDinheiro(economia) +
            " | Mínimo para economia positiva: " +
                ciclosMinimosEconomia(item) + " ciclos";
           
        const alerta = document.createElement("p");

        if (item.ciclos <= equilibrio) {
            alerta.textContent =
                "Atenção: os ciclos informados ainda não geram economia positiva.";
        } else {
            alerta.hidden = true;
        }

        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.type = "button";

        const remover = document.createElement("button");
        remover.textContent = "Remover";
        remover.type = "button";

        const formulario = document.createElement("div");
        formulario.className = "form-edicao";
        formulario.hidden = true;

        formulario.innerHTML = `
            <h3>Editar substituição</h3>

            <label>Local de aplicação</label>
            <input class="edit-local" type="text">

            <label>Modelo convencional</label>
            <select class="edit-convencional"></select>

            <label>Modelo reutilizável</label>
            <select class="edit-reutilizavel"></select>

            <label>Quantidade por caminhão</label>
            <input class="edit-quantidade" type="number" min="1" step="1">

            <label>Ciclos estimados de reutilização</label>
            <input class="edit-ciclos" type="number" min="1" step="1">
        `;

        const campoLocal =
            formulario.querySelector(".edit-local");

        const campoConvencional =
            formulario.querySelector(".edit-convencional");

        const campoReutilizavel =
            formulario.querySelector(".edit-reutilizavel");

        const campoQuantidade =
            formulario.querySelector(".edit-quantidade");

        const campoCiclos =
            formulario.querySelector(".edit-ciclos");

        // Copiar as opções dos produtos do cadastro original
        seletores[0].querySelectorAll("option").forEach(opcao => {
            campoConvencional.appendChild(opcao.cloneNode(true));
        });

        seletores[1].querySelectorAll("option").forEach(opcao => {
            campoReutilizavel.appendChild(opcao.cloneNode(true));
        });

        // Preencher os dados atuais
        campoLocal.value = item.local;
        campoConvencional.value = item.nomeConvencional;
        campoReutilizavel.value = item.nomeReutilizavel;
        campoQuantidade.value = item.quantidade;
        campoCiclos.value = item.ciclos;

        const salvar = document.createElement("button");
        salvar.textContent = "Salvar alterações";
        salvar.type = "button";

        const cancelar = document.createElement("button");
        cancelar.textContent = "Cancelar";
        cancelar.type = "button";

        salvar.onclick = function () {
            const novoLocal = campoLocal.value.trim();
            const novaQuantidade = Number(campoQuantidade.value);
            const novosCiclos = Number(campoCiclos.value);

            const indiceConvencional =
                campoConvencional.selectedIndex - 1;

            const indiceReutilizavel =
                campoReutilizavel.selectedIndex - 1;

            if (
                !novoLocal ||
                !Number.isInteger(novaQuantidade) ||
                novaQuantidade <= 0 ||
                !Number.isInteger(novosCiclos) ||
                novosCiclos <= 0 ||
                indiceConvencional < 0 ||
                indiceReutilizavel < 0
            ) {
                alert("Preencha todos os campos corretamente.");
                return;
            }

            substituicoes[indice] = {
                ...item,
                local: novoLocal,
                quantidade: novaQuantidade,
                ciclos: novosCiclos,

                nomeConvencional:
                    campoConvencional.options[
                        campoConvencional.selectedIndex
                    ].text,

                nomeReutilizavel:
                    campoReutilizavel.options[
                        campoReutilizavel.selectedIndex
                    ].text,

                precoConvencional:
                    modelosConvencionais[indiceConvencional],

                precoReutilizavel:
                    modelosReutilizaveis[indiceReutilizavel]
            };

            atualizarPainel();
        };

        cancelar.onclick = function () {
            formulario.hidden = true;
            editar.hidden = false;
        };

        editar.onclick = function () {
            formulario.hidden = false;
            editar.hidden = true;
        };

        remover.onclick = function () {
            const confirmar = confirm(
                "Deseja realmente remover este cadastro?"
            );

            if (confirmar) {
                substituicoes.splice(indice, 1);
                atualizarPainel();
            }
        };

        formulario.append(salvar, cancelar);

        linha.append(
            nome,
            detalhe,
            alerta,
            editar,
            remover,
            formulario
        );

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
        nomeConvencional:
            seletores[0].options[modeloConvencional + 1].text,
        nomeReutilizavel:
            seletores[1].options[modeloReutilizavel + 1].text,
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

// Validar e atualizar os parâmetros de produção
function validarProducao(campo, maximo = Infinity) {
    let valor = Number(campo.value);

    if (!Number.isFinite(valor) || valor < 0) {
        valor = 0;
    }

    valor = Math.floor(valor);

    if (valor > maximo) {
        valor = maximo;
    }

    campo.value = valor;

    return valor;
}

// Alterar produção diária
document.querySelector("#producao")
    .addEventListener("change", function () {
        producaoDiaria = validarProducao(this);
        atualizarPainel();
    });

// Alterar dias produtivos
document.querySelector("#diasMes")
    .addEventListener("change", function () {
        diasMes = validarProducao(this, 31);
        atualizarPainel();
    });

// Alterar meses produtivos
document.querySelector("#mesesAno")
    .addEventListener("change", function () {
        mesesAno = validarProducao(this, 12);
        atualizarPainel();
    });


// ----- Exportação para Excel (.xlsx) -----
botaoExportar.textContent = "Exportar para Excel";

botaoExportar.addEventListener("click", function () {
    if (!window.XLSX) {
        alert("Não foi possível carregar o recurso de Excel. Atualize a página e tente novamente.");
        return;
    }

    if (substituicoes.length === 0) {
        alert("Não há substituições cadastradas para exportar.");
        return;
    }

    const linhas = [[
        "Local",
        "Produto convencional",
        "Produto reutilizável",
        "Quantidade",
        "Preço convencional (R$)",
        "Preço reutilizável (R$)",
        "Ciclos",
        "Investimento inicial (R$)",
        "Economia por caminhão (R$)"
    ]];

    substituicoes.forEach(item => {
        linhas.push([
            item.local || "",
            item.nomeConvencional || "-",
            item.nomeReutilizavel || "-",
            Number(item.quantidade) || 0,
            Number(item.precoConvencional) || 0,
            Number(item.precoReutilizavel) || 0,
            Number(item.ciclos) || 0,
            investimentoInicial(item),
            calcularEconomia(item)
        ]);
    });

    const planilha = XLSX.utils.aoa_to_sheet(linhas);
    planilha["!cols"] = [
        { wch: 28 }, { wch: 30 }, { wch: 28 }, { wch: 12 },
        { wch: 22 }, { wch: 24 }, { wch: 10 }, { wch: 24 }, { wch: 28 }
    ];
    planilha["!autofilter"] = { ref: planilha["!ref"] };
    planilha["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

    // Formatar os valores monetários como números em reais no Excel.
    for (let linha = 2; linha <= linhas.length; linha++) {
        [5, 6, 8, 9].forEach(coluna => {
            const celula = XLSX.utils.encode_cell({ r: linha - 1, c: coluna - 1 });
            if (planilha[celula]) planilha[celula].z = '"R$" #,##0.00';
        });
    }

    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Substituições");
    XLSX.writeFile(livro, "relatorio-ecofix.xlsx");
});

// Atualizar todos os indicadores e informações do EcoFix
function atualizarPainel() {
    const economiaPorCaminhao = substituicoes.reduce(
        (total, item) => total + calcularEconomia(item),
        0
    );

    const economiaDiaria = economiaPorCaminhao * producaoDiaria;
    const economiaMensal = economiaDiaria * diasMes;
    const economiaAnual = economiaMensal * mesesAno;

    indicadores[0].textContent =
        formatarDinheiro(economiaPorCaminhao);

    indicadores[1].textContent =
        formatarDinheiro(economiaDiaria);

    indicadores[2].textContent =
        formatarDinheiro(economiaMensal);

    indicadores[3].textContent =
        formatarDinheiro(economiaAnual);

    salvarDados();
    atualizarLocais();
    atualizarAnalise();
    atualizarGraficos();
}

let ecofixAdmin=false, ecofixRemoteReady=false, ecofixRemoteEmpty=false, ecofixLocalBackup=null, ecofixClient=null, ecofixApplyingRemote=false;
const ecofixStatus=document.createElement('p'); ecofixStatus.id='ecofix-status'; document.querySelector('.cabecalho').insertAdjacentElement('afterend',ecofixStatus);
function ecofixMsg(t){ecofixStatus.textContent=t;}
function ecofixApply(d){ecofixApplyingRemote=true;substituicoes=Array.isArray(d.substituicoes)?d.substituicoes:[];producaoDiaria=d.producaoDiaria??88;diasMes=d.diasMes??22;mesesAno=d.mesesAno??12;document.querySelector('#producao').value=producaoDiaria;document.querySelector('#diasMes').value=diasMes;document.querySelector('#mesesAno').value=mesesAno;atualizarPainel();ecofixApplyingRemote=false;if(typeof ecofixPermissions==='function')ecofixPermissions();}
function ecofixPermissions(){cadastro.querySelectorAll('input,select,button').forEach(e=>{if(e!==botaoExportar)e.disabled=!ecofixAdmin;});configuracao.querySelectorAll('input').forEach(e=>e.disabled=!ecofixAdmin);document.querySelectorAll('.item-local button').forEach(e=>{if(['Editar','Remover','Salvar alterações','Cancelar'].includes(e.textContent))e.hidden=!ecofixAdmin;});}
async function ecofixCheckAdmin(){const {data:{user}}=await ecofixClient.auth.getUser();ecofixAdmin=false;if(user){const {data,error}=await ecofixClient.rpc('is_ecofix_admin');if(!error)ecofixAdmin=data===true;}document.querySelector('#ef-login').hidden=!!user;document.querySelector('#ef-logout').hidden=!user;document.querySelector('#ef-auth-status').textContent=!user?'Visitante: somente leitura.':ecofixAdmin?'Administrador conectado.':'Usuário sem permissão de edição.';document.querySelector('#ef-migrate').hidden=!(ecofixAdmin&&ecofixRemoteEmpty&&ecofixLocalBackup&&ecofixLocalBackup.substituicoes.length);ecofixPermissions();}
async function ecofixStart(){
 const panel=document.createElement('section');panel.className='cadastro admin-panel';panel.id='ef-admin-panel';panel.hidden=true;panel.innerHTML='<div class="admin-panel-head"><h2>Acesso administrativo</h2><button type="button" id="ef-close-login" class="admin-close" aria-label="Fechar">×</button></div><p id="ef-auth-status">Conectando...</p><form id="ef-login"><label for="ef-email">E-mail</label><input id="ef-email" type="email" autocomplete="username" required><label for="ef-password">Senha</label><input id="ef-password" type="password" autocomplete="current-password" required><button type="submit">Entrar</button></form><button id="ef-logout" hidden>Sair</button><button id="ef-migrate" hidden>Migrar dados locais para o banco</button>';document.querySelector('.container').prepend(panel);const adminToggle=document.createElement('button');adminToggle.type='button';adminToggle.className='admin-icon';adminToggle.setAttribute('aria-label','Acesso administrativo');adminToggle.title='Acesso administrativo';adminToggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/></svg>';document.querySelector('.cabecalho').appendChild(adminToggle);adminToggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;});document.querySelector('#ef-close-login').addEventListener('click',()=>{panel.hidden=true;});
 if(!window.supabase||!window.ECOFIX_SUPABASE_URL||!window.ECOFIX_SUPABASE_KEY){ecofixMsg('Configuração do Supabase ausente.');return;}
 ecofixClient=window.supabase.createClient(window.ECOFIX_SUPABASE_URL,window.ECOFIX_SUPABASE_KEY);ecofixLocalBackup={substituicoes:substituicoes.slice(),producaoDiaria,diasMes,mesesAno,versaoDados:2};
 document.querySelector('#ef-login').addEventListener('submit',async e=>{e.preventDefault();const {error}=await ecofixClient.auth.signInWithPassword({email:document.querySelector('#ef-email').value.trim(),password:document.querySelector('#ef-password').value});document.querySelector('#ef-password').value='';if(error){ecofixMsg('Login não realizado. Confira e-mail e senha.');return;}await ecofixCheckAdmin();});
 document.querySelector('#ef-logout').addEventListener('click',async()=>{await ecofixClient.auth.signOut();await ecofixCheckAdmin();});
 document.querySelector('#ef-migrate').addEventListener('click',async()=>{if(!ecofixAdmin||!ecofixLocalBackup||!confirm('Migrar '+ecofixLocalBackup.substituicoes.length+' cadastro(s) para o banco compartilhado? A cópia local será preservada.'))return;const backup=ecofixLocalBackup;const {error}=await ecofixClient.from('ecofix_state').update({data:backup,updated_at:new Date().toISOString()}).eq('id',1);if(error){ecofixMsg('Migração falhou; a cópia local continua preservada.');return;}ecofixRemoteEmpty=false;ecofixLocalBackup=null;ecofixApply(backup);document.querySelector('#ef-migrate').hidden=true;ecofixMsg('Migração concluída.');});
 const {data:row,error}=await ecofixClient.from('ecofix_state').select('data').eq('id',1).single();
 if(error){console.error(error);ecofixMsg('Erro ao ler banco compartilhado. Confira a configuração SQL.');await ecofixCheckAdmin();return;} ecofixRemoteReady=true;ecofixRemoteEmpty=!(row.data.substituicoes||[]).length;
 if(ecofixRemoteEmpty){ecofixApply({substituicoes:[],producaoDiaria:88,diasMes:22,mesesAno:12});ecofixMsg('Banco central vazio. Entre como administrador para migrar seus dados locais.');}else{ecofixApply(row.data);ecofixLocalBackup=null;ecofixMsg('Dados carregados do banco compartilhado.');}
 await ecofixCheckAdmin();ecofixClient.auth.onAuthStateChange(()=>setTimeout(ecofixCheckAdmin,0));
 ecofixClient.channel('ecofix-state').on('postgres_changes',{event:'*',schema:'public',table:'ecofix_state',filter:'id=eq.1'},p=>{if(p.new?.data&&!ecofixAdmin){ecofixApply(p.new.data);ecofixMsg('Dados atualizados por um administrador.');}}).subscribe();
}
const ecofixOriginalSave=salvarDados;
salvarDados=function(){ecofixOriginalSave();if(ecofixClient&&ecofixRemoteReady&&ecofixAdmin&&!ecofixApplyingRemote){const payload={substituicoes,producaoDiaria,diasMes,mesesAno,versaoDados:2};ecofixClient.from('ecofix_state').upsert({id:1,data:payload,updated_at:new Date().toISOString()},{onConflict:'id'}).then(({error})=>{if(error){console.error(error);ecofixMsg('Falha ao sincronizar com o banco.');}else ecofixMsg('Dados sincronizados.');});}};
ecofixStart().catch(e=>{console.error(e);ecofixMsg('Falha ao iniciar conexão com o banco.');});
