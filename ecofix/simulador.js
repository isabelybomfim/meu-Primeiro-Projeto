/* EcoFix — Simulador independente. Leitura do Supabase; nunca grava no banco. */
(() => {
  "use strict";
  const defaults={quantidade:6,producao:88,dias:22,meses:12,tyton:1.03,reutilizavel:5.75,ciclos:20};
  const storageKey="ecofix_simulador_params_v1";
  const ids={quantidade:"sim-quantidade",producao:"sim-producao",dias:"sim-dias",meses:"sim-meses",tyton:"sim-tyton",reutilizavel:"sim-reutilizavel",ciclos:"sim-ciclos"};
  const money=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const integer=n=>Math.round(n).toLocaleString("pt-BR");
  const number=n=>Number(n).toLocaleString("pt-BR",{maximumFractionDigits:2});
  const $=id=>document.getElementById(id);
  let chart=null;
  let params={...defaults};
  let loadedShared=false;
  let lastCalculation=null;

  function readParams(){
    const next={};
    for(const [key,id] of Object.entries(ids)){
      const el=$(id), value=Number(el.value);
      const min=Number(el.min), max=Number(el.max);
      if(!Number.isFinite(value)||value<min||value>max||(el.step==="1"&&!Number.isInteger(value))){
        el.setCustomValidity("Informe um valor válido dentro do intervalo permitido.");
        el.reportValidity();el.focus();return null;
      }
      el.setCustomValidity("");next[key]=value;
    }
    return next;
  }
  function calculate(p){
    const unidadesDia=p.quantidade*p.producao;
    const unidadesMes=unidadesDia*p.dias;
    const unidadesAno=unidadesMes*p.meses;
    const custoDescartavelAno=unidadesAno*p.tyton;
    const estoqueInicial=unidadesDia;
    const investimento=estoqueInicial*p.reutilizavel;
    const custoAmortizadoAno=unidadesAno*(p.reutilizavel/p.ciclos);
    const economiaPrimeiroAno=custoDescartavelAno-investimento;
    const economiaOperacional=custoDescartavelAno-custoAmortizadoAno;
    const equilibrio=Math.floor(p.reutilizavel/p.tyton)+1;
    return {unidadesDia,unidadesMes,unidadesAno,custoDescartavelAno,estoqueInicial,investimento,custoAmortizadoAno,economiaPrimeiroAno,economiaOperacional,equilibrio,residuoPotencial:unidadesAno};
  }
  function setText(id,value){$(id).textContent=value;}
  function render(){
    const p=readParams();if(!p)return;
    params=p;
    try{localStorage.setItem(storageKey,JSON.stringify(params));}catch(_){}
    const c=calculate(p);lastCalculation={...c,...p};
    setText("kpi-descartavel",money(c.custoDescartavelAno));
    setText("kpi-volume",integer(c.unidadesAno)+" unidades descartáveis/ano");
    setText("kpi-investimento",money(c.investimento));
    setText("kpi-estoque",integer(c.estoqueInicial)+" fitas para o estoque inicial");
    setText("kpi-primeiro-ano",money(c.economiaPrimeiroAno));
    setText("kpi-amortizado",money(c.custoAmortizadoAno));
    setText("kpi-economia-amortizada",money(c.economiaOperacional)+" de diferença anual estimada");
    setText("kpi-economia",money(c.economiaOperacional));
    setText("kpi-equilibrio",integer(c.equilibrio)+" ciclos");
    setText("kpi-residuo",integer(c.residuoPotencial)+" unidades/ano");
    setText("tab-volume",integer(c.unidadesAno)+" unidades");
    setText("tab-descartavel",money(c.custoDescartavelAno));
    setText("tab-investimento",money(c.investimento));
    setText("tab-amortizado",money(c.custoAmortizadoAno));
    setText("tab-economia",money(c.economiaOperacional));
    if(window.Chart){
      const data={labels:["Custo anual descartável","Investimento inicial reutilizável","Custo reutilizável amortizado/ano"],datasets:[{label:"Custo projetado (R$)",data:[c.custoDescartavelAno,c.investimento,c.custoAmortizadoAno],backgroundColor:["#80B9E0","#005B9A","#287DB5"]}]};
      if(chart){chart.data=data;chart.update();}
      else chart=new Chart($("sim-chart"),{type:"bar",data,options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>money(ctx.raw)}}},scales:{y:{beginAtZero:true,ticks:{callback:value=>money(value)}}}}});
    }
  }
  function csv(){
    if(!lastCalculation)return;
    const c=lastCalculation;
    const rows=[
      ["EcoFix - Simulador de economia"],
      ["Indicador","Valor","Unidade"],
      ["Fitas por caminhão",c.quantidade,"unidades"],
      ["Caminhões por dia",c.producao,"unidades"],
      ["Dias produtivos por mês",c.dias,"dias"],
      ["Meses produtivos por ano",c.meses,"meses"],
      ["Preço Tyton",c.tyton,"BRL/unidade"],
      ["Preço reutilizável",c.reutilizavel,"BRL/unidade"],
      ["Ciclos estimados",c.ciclos,"ciclos"],
      ["Consumo descartável anual",c.unidadesAno,"unidades"],
      ["Gasto anual descartável",c.custoDescartavelAno.toFixed(2),"BRL"],
      ["Estoque inicial",c.estoqueInicial,"unidades"],
      ["Investimento inicial",c.investimento.toFixed(2),"BRL"],
      ["Custo reutilizável amortizado anual",c.custoAmortizadoAno.toFixed(2),"BRL"],
      ["Economia potencial no primeiro ano",c.economiaPrimeiroAno.toFixed(2),"BRL"],
      ["Economia operacional estimada anual",c.economiaOperacional.toFixed(2),"BRL"],
      ["Ponto de equilíbrio",c.equilibrio,"ciclos"],
      ["Unidades descartáveis potencialmente evitadas",c.residuoPotencial,"unidades"],
      ["Observação","Todos os valores são projeções; não representam resultados financeiros ou ambientais realizados."]
    ];
    const content="\uFEFF"+rows.map(row=>row.map(value=>'"'+String(value??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
    const blob=new Blob([content],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="ecofix-simulacao.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  function applySaved(){
    try{
      const saved=JSON.parse(localStorage.getItem(storageKey)||"null");
      if(saved&&typeof saved==="object")for(const [key,id] of Object.entries(ids))if(Number.isFinite(Number(saved[key]))) $(id).value=saved[key];
    }catch(_){}
  }
  async function loadSharedDefaults(){
    const status=$("sim-status");
    if(!window.supabase||!window.ECOFIX_SUPABASE_URL||!window.ECOFIX_SUPABASE_KEY){
      status.textContent="Não foi possível acessar o banco compartilhado. Os valores padrão estão disponíveis para simulação.";return;
    }
    try{
      const client=window.supabase.createClient(window.ECOFIX_SUPABASE_URL,window.ECOFIX_SUPABASE_KEY);
      const {data,error}=await client.from("ecofix_state").select("data").eq("id",1).maybeSingle();
      if(error)throw error;
      const state=data?.data||{};
      const items=Array.isArray(state.substituicoes)?state.substituicoes:[];
      if(items.length){
        const total=items.reduce((sum,item)=>sum+Math.max(0,Number(item.quantidade)||0),0);
        if(total>0) $("sim-quantidade").value=String(total);
        const first=items[0];
        if(Number(first.precoConvencional)>0)$("sim-tyton").value=String(first.precoConvencional);
        if(Number(first.precoReutilizavel)>0)$("sim-reutilizavel").value=String(first.precoReutilizavel);
        const cycles=items.reduce((sum,item)=>sum+(Number(item.ciclos)>0?Number(item.ciclos):20),0)/items.length;
        if(cycles>0)$("sim-ciclos").value=String(Math.max(1,Math.round(cycles)));
      }
      if(Number(state.producaoDiaria)>0)$("sim-producao").value=String(state.producaoDiaria);
      if(Number(state.diasMes)>0)$("sim-dias").value=String(state.diasMes);
      if(Number(state.mesesAno)>0)$("sim-meses").value=String(state.mesesAno);
      loadedShared=true;
      status.textContent="Parâmetros carregados do banco compartilhado em modo somente leitura. As alterações desta página não são sincronizadas.";
    }catch(error){
      console.warn("EcoFix simulador: não foi possível carregar parâmetros compartilhados.",error);
      status.textContent="Banco compartilhado indisponível no momento. Você pode simular com os valores padrão; nenhum dado será alterado.";
    }
  }
  $("sim-reset").addEventListener("click",()=>{
    for(const [key,id] of Object.entries(ids))$(id).value=String(defaults[key]);
    try{localStorage.removeItem(storageKey);}catch(_){}
    render();
  });
  $("sim-csv").addEventListener("click",csv);
  Object.values(ids).forEach(id=>$(id).addEventListener("input",render));
  (async()=>{
    await loadSharedDefaults();
    applySaved();
    render();
    if(!loadedShared&&$("sim-status").textContent.includes("indisponível"))return;
  })();
})();