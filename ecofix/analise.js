(() => {
    const status = document.querySelector("#analise-status");
    const resumo = document.querySelector("#analise-resumo");
    const cenarios = document.querySelector("#analise-cenarios");
    const detalhes = document.querySelector("#analise-detalhes");
    const money = value => Number(value || 0).toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
    const custoConvencional = item => Number(item.quantidade) * Number(item.precoConvencional);
    const custoAmortizado = (item, ciclos=item.ciclos) => Number(item.quantidade) * (Number(item.precoReutilizavel) / Math.max(1, Number(ciclos)));
    const economia = (item, ciclos=item.ciclos) => custoConvencional(item) - custoAmortizado(item,ciclos);
    const equilibrio = item => Number(item.precoReutilizavel) / Number(item.precoConvencional);
    const investimento = items => items.reduce((s,item)=>s+Number(item.quantidade)*Number(item.precoReutilizavel),0);
    const anual = (items, fator, producao, dias, meses) => items.reduce((s,item)=>s+economia(item,Math.max(1,Math.round(Number(item.ciclos)*fator))),0)*producao*dias*meses;
    function card(label,value){const el=document.createElement("div");el.className="card";const h=document.createElement("h3");h.textContent=label;const p=document.createElement("p");p.textContent=value;el.append(h,p);resumo.append(el);}
    function scenario(label,value,description){const el=document.createElement("article");el.className="cenario-card";const h=document.createElement("h3");h.textContent=label;const p=document.createElement("p");p.textContent=value;const small=document.createElement("small");small.textContent=description;el.append(h,p,small);cenarios.append(el);}
    function render(data){
        const items=Array.isArray(data.substituicoes)?data.substituicoes:[];
        const producao=Number(data.producaoDiaria??88), dias=Number(data.diasMes??22), meses=Number(data.mesesAno??12);
        resumo.innerHTML="";cenarios.innerHTML="";detalhes.innerHTML="";
        if(!items.length){status.textContent="Ainda não há substituições cadastradas para analisar.";document.querySelector(".analise-graficos").hidden=true;return;}
        status.textContent="Dados carregados do banco compartilhado. Valores apresentados como estimativas.";
        const porCaminhao=items.reduce((s,item)=>s+economia(item),0);
        card("Investimento inicial",money(investimento(items)));
        card("Economia estimada por caminhão",money(porCaminhao));
        card("Economia estimada mensal",money(porCaminhao*producao*dias));
        card("Economia estimada anual",money(porCaminhao*producao*dias*meses));
        scenario("Conservador · 50% dos ciclos",money(anual(items,.5,producao,dias,meses))+"/ano","Considera metade dos ciclos informados.");
        scenario("Informado · 100% dos ciclos",money(anual(items,1,producao,dias,meses))+"/ano","Considera os ciclos atualmente cadastrados.");
        scenario("Otimista · 150% dos ciclos",money(anual(items,1.5,producao,dias,meses))+"/ano","Considera uma ampliação de 50% nos ciclos.");
        items.forEach(item=>{const row=document.createElement("article");row.className="item-local";const h=document.createElement("strong");h.textContent=item.local;const p=document.createElement("p");p.textContent="Quantidade por caminhão: "+item.quantidade+" · Ciclos estimados: "+item.ciclos+" · Economia estimada por caminhão: "+money(economia(item))+" · Ponto de equilíbrio: "+equilibrio(item).toFixed(1).replace(".",",")+" ciclos.";row.append(h,p);if(Number(item.ciclos)<=equilibrio(item)){const warning=document.createElement("p");warning.className="aviso-equilibrio";warning.textContent="Atenção: os ciclos informados ainda não geram economia positiva.";row.append(warning);}detalhes.append(row);});
        const labels=items.map(i=>i.local), colors=["#001E50","#005B9A","#287DB5","#80B9E0","#A9CDE8","#456A91","#6F8EAE","#C5D9EA"];
        const opts={responsive:true,maintainAspectRatio:true,plugins:{legend:{position:"bottom"}}};
        new Chart(document.querySelector("#graficoCustos"),{type:"bar",data:{labels,datasets:[{label:"Convencional",data:items.map(custoConvencional),backgroundColor:"#80B9E0"},{label:"Reutilizável amortizada",data:items.map(custoAmortizado),backgroundColor:"#005B9A"}]},options:opts});
        const monthLabels=Array.from({length:Math.max(0,meses)},(_,i)=>"Mês "+(i+1));
        new Chart(document.querySelector("#graficoProjecao"),{type:"line",data:{labels:monthLabels,datasets:[["Conservador",.5],["Informado",1],["Otimista",1.5]].map(([label,factor],i)=>({label,data:monthLabels.map((_,n)=>anual(items,factor,producao,dias,meses)/Math.max(1,meses)*(n+1)),borderColor:colors[i],tension:.2}))},options:opts});
        const positive=items.filter(i=>economia(i)>0);document.querySelector("#blocoDivisao").hidden=!positive.length;
        if(positive.length)new Chart(document.querySelector("#graficoDivisao"),{type:"doughnut",data:{labels:positive.map(i=>i.local),datasets:[{data:positive.map(i=>economia(i)),backgroundColor:positive.map((_,i)=>colors[i%colors.length])}]},options:opts});
        const maxCycle=Math.min(200,Math.max(10,...items.map(i=>Math.max(Number(i.ciclos)*2,Math.ceil(equilibrio(i)*2)))));
        const cycleLabels=Array.from({length:maxCycle},(_,i)=>i+1);
        new Chart(document.querySelector("#graficoEquilibrio"),{type:"line",data:{labels:cycleLabels,datasets:items.map((item,i)=>({label:item.local,data:cycleLabels.map(c=>economia(item,c)),borderColor:colors[i%colors.length],pointRadius:0,tension:.2}))},options:opts});
    }
    async function start(){
        if(!window.supabase||!window.ECOFIX_SUPABASE_URL||!window.ECOFIX_SUPABASE_KEY){status.textContent="Não foi possível conectar ao banco de dados.";return;}
        const client=window.supabase.createClient(window.ECOFIX_SUPABASE_URL,window.ECOFIX_SUPABASE_KEY);
        const {data,error}=await client.from("ecofix_state").select("data").eq("id",1).single();
        if(error){console.error(error);status.textContent="Erro ao carregar os dados compartilhados.";return;}
        render(data.data||{});
        client.channel("ecofix-analysis").on("postgres_changes",{event:"*",schema:"public",table:"ecofix_state",filter:"id=eq.1"},payload=>{if(payload.new?.data)render(payload.new.data);}).subscribe();
    }
    start().catch(error=>{console.error(error);status.textContent="Falha ao carregar a análise.";});
})();