<template>
  <div class="slidev-layout odsi-layout odsi-dark odsi-section">
    <img class="odsi-logo-sm" src="/odsi/odsi-full-light.png" alt="ODSI" />
    <slot />
    <div class="odsi-num"><SlideCurrentNo /> / <SlidesTotal /></div>
  </div>
</template>
