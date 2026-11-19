/* EcoFix — Simulador interativo da proposta. Não altera o banco nem resultados realizados. */
(() => {
  "use strict";
  const panel = document.querySelector(".proposta-base");
  if (!panel) return;
  const defaults = {fitas:6, producao:88, dias:22, meses:12, tyton:1.03, reutilizavel:5.75};
  const storageKey = "ecofix_simulacao_proposta_v1";
  const money = n => n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const integer = n => Math.round(n).toLocaleString("pt-BR");
  const decimal = (n,d=2) => n.toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}") || {}; } catch (_) {}
  let params = {...defaults,...Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,Number.isFinite(Number(saved[k])) && saved[k]!==undefined ? Number(saved[k]) : v]))};
  const head = panel.querySelector(".proposta-cabecalho");
  const grid = panel.querySelector(".proposta-grid");
  const metrics = panel.querySelector(".proposta-metricas");
  const note = panel.querySelector(".premissas-alerta");
  const fields = [
    ["fitas","Fitas por caminhão","1","1","50"],
    ["producao","Caminhões por dia","1","1","10000"],
    ["dias","Dias produtivos por mês","1","1","31"],
    ["meses","Meses produtivos por ano","1","1","12"],
    ["tyton","Preço da Tyton (R$)","0.01","0.01","100000"],
    ["reutilizavel","Preço reutilizável (R$)","0.01","0.01","100000"]
  ];
  const controls = document.createElement("details");
  controls.className = "simulador-controles";
  controls.innerHTML = '<summary>Simular outros parâmetros <span>Alterações apenas neste navegador</span></summary><div class="simulador-campos"></div><div class="simulador-acoes"><button type="button" class="simulador-restaurar">Restaurar valores informados</button><small>Esta simulação não modifica cadastros, banco compartilhado ou resultados realizados.</small></div>';
  const inputs = controls.querySelector(".simulador-campos");
  fields.forEach(([key,label,step,min,max]) => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input = document.createElement("input");
    input.type = "number"; input.step=step; input.min=min; input.max=max;
    input.value=String(params[key]); input.dataset.param=key;
    wrapper.appendChild(input); inputs.appendChild(wrapper);
    input.addEventListener("change",()=>{
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < Number(min) || value > Number(max) || (step==="1" && !Number.isInteger(value))) {
        input.value=String(params[key]);return;
      }
      params[key]=value;
      try { localStorage.setItem(storageKey,JSON.stringify(params)); } catch (_) {}
      render();
    });
  });
  controls.querySelector(".simulador-restaurar").addEventListener("click",()=>{
    params={...defaults};
    inputs.querySelectorAll("input").forEach(el=>el.value=String(params[el.dataset.param]));
    try { localStorage.removeItem(storageKey); } catch (_) {}
    render();
  });
  head.insertAdjacentElement("afterend",controls);
  function render() {
    const p=params, daily=p.fitas*p.producao, monthly=daily*p.dias, annual=monthly*p.meses;
    const costDaily=daily*p.tyton, costMonthly=monthly*p.tyton, costAnnual=annual*p.tyton;
    const stock=daily, investment=stock*p.reutilizavel, saving=costAnnual-investment;
    const reduction=costAnnual>0 ? saving/costAnnual*100 : 0;
    const uses=p.tyton>0 ? Math.floor(p.reutilizavel/p.tyton)+1 : 0;
    const payback=costDaily>0 ? investment/costDaily : 0;
    head.querySelector("p").textContent = `Premissas da simulação: ${integer(p.fitas)} fitas por caminhão, ${integer(p.producao)} caminhões/dia, ${integer(p.dias)} dias/mês e ${integer(p.meses)} meses/ano.`;
    const cards=[
      ["Consumo atual",integer(daily),"fitas descartáveis por dia",`${integer(monthly)} por mês · ${integer(annual)} por ano`],
      ["Custo da Tyton",money(p.tyton),"por unidade",`${money(costDaily)}/dia · ${money(costMonthly)}/mês`],
      ["Gasto anual atual",money(costAnnual),"com fitas descartáveis",`${integer(annual)} unidades × ${money(p.tyton)}`],
      ["Estoque reutilizável inicial",integer(stock),"fitas reutilizáveis",`${integer(p.fitas)} por caminhão × ${integer(p.producao)} caminhões/dia`],
      ["Investimento inicial",money(investment),`para ${integer(stock)} unidades`,`Preço unitário reutilizável: ${money(p.reutilizavel)}`],
      ["Economia potencial no 1º ano",money(saving),`${decimal(reduction)}% de redução estimada`,"Gasto descartável anual menos investimento inicial reutilizável"]
    ];
    grid.replaceChildren();
    cards.forEach(([label,value,desc,detail],i)=>{
      const card=document.createElement("article");card.className="proposta-card"+(i===5?" destaque":"");
      const h=document.createElement("h3");h.textContent=label;
      const strong=document.createElement("strong");strong.textContent=value;
      const pEl=document.createElement("p");pEl.textContent=desc;
      const small=document.createElement("small");small.textContent=detail;
      card.append(h,strong,pEl,small);grid.append(card);
    });
    metrics.replaceChildren();
    [
      ["Ponto de equilíbrio",`${integer(uses)} utilizações`,`${money(p.reutilizavel)} ÷ ${money(p.tyton)} = ${decimal(p.reutilizavel/p.tyton)}; utilizações mínimas para superar o preço de aquisição descartável.`],
      ["Equivalência do investimento",`${decimal(payback)} dias produtivos`,"Equivalência financeira em gasto evitado; não é prazo de retorno operacional comprovado."],
      ["Resíduo potencialmente evitado",`${integer(annual)} unidades/ano`,"Se todas as posições substituírem Tytons e a recuperação/reutilização for efetiva."]
    ].forEach(([label,value,detail])=>{
      const div=document.createElement("div"),span=document.createElement("span"),strong=document.createElement("strong"),small=document.createElement("small");
      span.textContent=label;strong.textContent=value;small.textContent=detail;div.append(span,strong,small);metrics.append(div);
    });
    note.innerHTML='<strong>Premissas e pontos a validar</strong><ul><li>O estoque inicial equivale ao consumo de um dia, e só basta para o ano se houver recuperação e disponibilidade contínua das fitas.</li><li>A durabilidade superior a um ano é uma hipótese informada, ainda não comprovada por registros operacionais.</li><li>Não inclui perdas, reposições, inspeção, limpeza, transporte ou outros custos.</li><li>Valores simulados são projeções, não economia realizada. Alterar parâmetros aqui não altera o banco compartilhado.</li></ul>';
  }
  render();
})();
