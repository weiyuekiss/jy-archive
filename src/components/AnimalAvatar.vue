<script setup>
defineProps({ src: String, name: { type: String, default: '' }, animal: { type: String, default: 'bunny' } })
</script>

<template>
  <span class="animal-avatar" :class="`animal-${animal}`">
    <svg class="animal-border" viewBox="0 0 100 112" fill="none" shape-rendering="crispEdges" aria-hidden="true">
      <path class="frame-shadow" d="M14 37h72v6h6v57h-6v6H14v-6H8V43h6z"/>
      <template v-if="animal === 'bunny'">
        <path class="frame-outline" d="M20 38V10h5V5h13v5h5v28h14V10h5V5h13v5h5v28z"/>
        <path class="frame-fill" d="M23 38V12h5V8h7v4h5v26h20V12h5V8h7v4h5v26z"/>
        <path class="ear-inner" d="M29 15h6v21h-6zM65 15h6v21h-6z"/>
      </template>
      <template v-else-if="animal === 'cat'">
        <path class="frame-outline" d="M14 43V13h7v5h7v5h8v8h28v-8h8v-5h7v-5h7v30z"/>
        <path class="frame-fill" d="M17 43V19h4v5h7v5h7v8h30v-8h7v-5h7v-5h4v24z"/>
        <path class="ear-inner" d="M21 27h5v5h5v7H21zM74 27h5v12H69v-7h5z"/>
      </template>
      <template v-else-if="animal === 'puppy'">
        <path class="frame-outline" d="M10 23h23v7h34v-7h23v40H77V39H23v24H10z"/>
        <path class="ear-inner" d="M13 26h17v10H20v23h-7zM70 26h17v33h-7V36H70z"/>
      </template>
      <template v-else-if="animal === 'fox'">
        <path class="frame-outline" d="M13 40V8h6v5h7v7h8v12h32V20h8v-7h7V8h6v32z"/>
        <path class="frame-fill" d="M17 38V17h4v5h8v12h42V22h8v-5h4v21z"/>
        <path fill="#fff6e8" d="M19 23h5v7h5v7H19zM76 23h5v14H71v-7h5z"/>
      </template>
      <template v-else-if="animal === 'frog'">
        <path class="frame-outline" d="M12 39V19h5v-5h20v5h5v15h16V19h5v-5h20v5h5v20z"/>
        <path class="frame-fill" d="M15 39V21h5v-4h14v4h5v18h22V21h5v-4h14v4h5v18z"/>
        <path fill="#fffdf5" d="M20 23h12v12H20zM68 23h12v12H68z"/><path class="frame-outline" d="M25 26h5v6h-5zM70 26h5v6h-5z"/>
      </template>
      <template v-else>
        <path class="frame-outline" d="M12 42V23h5v-5h18v5h5v19h20V23h5v-5h18v5h5v19z"/>
        <path class="frame-fill" d="M15 42V25h5v-4h12v4h5v17h26V25h5v-4h12v4h5v17z"/>
        <path class="ear-inner" d="M21 27h10v12H21zM69 27h10v12H69z"/>
      </template>
      <path class="frame-outline" d="M14 35h72v6h6v57h-6v6H14v-6H8V41h6z"/>
      <path class="frame-fill" d="M15 38h70v6h4v51h-6v6H17v-6h-6V44h4z"/>
      <path fill="#fffaf8" opacity=".9" d="M18 40h64v2H18zM13 46h2v44h-2z"/>
      <path class="ear-inner" d="M16 85h10v4H16zM74 85h10v4H74z"/>
      <path class="frame-outline" d="M43 92h3v3h8v-3h3v5h-4v2h-6v-2h-4z"/>
    </svg>
    <span class="animal-photo"><img v-if="src" :src="src" :alt="name"/><svg v-else viewBox="0 0 48 48" fill="none" shape-rendering="crispEdges" aria-hidden="true"><path fill="var(--animal-line)" opacity=".55" d="M12 20V9h5l6 7h2l6-7h5v11l3 4v12h-5v4H14v-4H9V24z"/><path fill="#fffaf6" d="M14 22V14l8 6h4l8-6v8l3 4v8h-5v4H16v-4h-5v-8z"/><path fill="var(--animal-line)" d="M17 26h3v4h-3zM28 26h3v4h-3zM23 32h3v2h-3z"/><path fill="#efc1cd" d="M14 31h6v2h-6zM29 31h6v2h-6z"/></svg></span>
    <span class="animal-bow" aria-hidden="true">✦</span>
  </span>
</template>

<style scoped>
.animal-avatar{--animal-line:#b895b0;--animal-fill:#f7e1ea;--animal-ear:#eabacb;position:relative;display:block;width:110px;aspect-ratio:100/112;flex:none}.animal-cat{--animal-line:#8facc5;--animal-fill:#e1eff9;--animal-ear:#bdd6ed}.animal-bear{--animal-line:#b6a18a;--animal-fill:#f5ead5;--animal-ear:#dfc5aa}.animal-puppy{--animal-line:#ad96b5;--animal-fill:#eee2f6;--animal-ear:#c6aed7}.animal-fox{--animal-line:#bc9387;--animal-fill:#ffe1cb;--animal-ear:#edb294}.animal-panda{--animal-line:#878ca5;--animal-fill:#f0f4fa;--animal-ear:#858ba3}.animal-hamster{--animal-line:#b49b88;--animal-fill:#fff0d3;--animal-ear:#efc6bd}.animal-frog{--animal-line:#8ba99a;--animal-fill:#deefda;--animal-ear:#b8d9b0}.animal-panda .ear-inner{fill:#858ba3}.animal-hamster .ear-inner{fill:#edb9bb}.animal-border{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.frame-outline{fill:var(--animal-line)}.frame-fill{fill:var(--animal-fill)}.ear-inner{fill:var(--animal-ear)}.frame-shadow{fill:#b7a7c2;transform:translateY(3px);opacity:.18}.animal-photo{position:absolute;top:40%;left:20%;width:60%;height:39%;display:grid;place-items:center;overflow:hidden;background:#fffaf7;box-shadow:0 0 0 1px #ffffffa8}.animal-photo img{width:100%;height:100%;object-fit:cover}.animal-photo svg{width:85%;height:95%}.animal-bow{position:absolute;right:5%;bottom:12%;font-size:20px;color:var(--animal-line);text-shadow:1px 1px #fff}
</style>
