<script setup lang="ts">
import { ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, Mail, Phone } from "@lucide/vue";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { HOMEPAGE_CONTENT } from "~/constants/homepage";

useSeoMeta({
  title: "Indigenous · Precision with purpose",
  description: "Discover Indigenous, our passion for surgical instruments, and the people and purpose behind better care.",
});

const pictures = [
  {
    src: "/images/home/clinical-care.jpg",
    alt: "A healthcare professional with a stethoscope using a phone",
    width: 1500,
    height: 1000,
    title: "A shared commitment to care.",
    caption: "The people, conversations, and collaboration that inspire us.",
  },
  {
    src: "/images/home/surgical-team.jpg",
    alt: "A surgical team working together in an operating theatre",
    width: 2200,
    height: 1467,
    title: "Purpose in every procedure.",
    caption: "Inspired by the focus and dedication of surgical teams.",
  },
  {
    src: "/images/home/medical-team.jpg",
    alt: "A doctor wearing glasses, a surgical mask, and a stethoscope",
    width: 1500,
    height: 2250,
    title: "People at the heart of progress.",
    caption: "A human perspective on the future of healthcare.",
  },
];

const currentPicture = ref(0);
let carouselTimer: ReturnType<typeof setInterval> | undefined;

function startCarousel() {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    currentPicture.value = (currentPicture.value + 1) % pictures.length;
  }, 5000);
}

function selectPicture(index: number) {
  currentPicture.value = index;
  if (carouselTimer) startCarousel();
}

function changePicture(direction: number) {
  selectPicture((currentPicture.value + direction + pictures.length) % pictures.length);
}

onMounted(startCarousel);
onBeforeUnmount(() => clearInterval(carouselTimer));
</script>

<template>
  <div class="homepage">
    <section class="hero" aria-labelledby="hero-title">
      <img
        class="hero-photo"
        src="/images/home/surgical-instruments.jpg"
        alt="Surgical scissors, forceps, and precision instruments arranged in a stainless steel tray"
        width="2200"
        height="1467"
        fetchpriority="high"
      >
      <div class="hero-inner page-width">
        <div class="hero-panel">
          <p class="eyebrow hero-eyebrow"><span /> Indigenous</p>
          <h1 id="hero-title">Precision<br>with purpose</h1>
          <p class="hero-description">
            Behind every instrument is a greater purpose.<br class="desktop-break">
            Supporting the hands that care for others.
          </p>
          <button class="catalogue-button" type="button" disabled>
            <ArrowDownToLine :size="19" aria-hidden="true" />
            Download full catalogue
            <span class="pdf-label">PDF</span>
          </button>
        </div>
        <a class="hero-discover" href="#about">
          <span>Discover Indigenous</span>
          <ArrowDown :size="17" aria-hidden="true" />
        </a>
      </div>
    </section>

    <div class="intro-strip">
      <div class="page-width intro-strip-inner">
        <p>Surgical instruments.<br><strong>Human purpose.</strong></p>
        <span class="intro-divider" aria-hidden="true" />
        <p class="intro-statement">Precision in the details.<br>People at the heart of it all.</p>
        <span class="intro-mark" aria-hidden="true">+</span>
      </div>
    </div>

    <section id="about" class="about-section page-width" aria-labelledby="about-title">
      <div class="about-introduction">
        <div class="about-heading">
          <p class="eyebrow"><span /> About us</p>
          <h2 id="about-title">Better instruments.<br><span>A shared purpose.</span></h2>
          <p class="section-intro">Get to know the story and the passion behind Indigenous.</p>
        </div>
        <div class="about-stories">
          <article>
            <p class="story-number" aria-hidden="true">01 / OUR BEGINNINGS</p>
            <h3>A brief history</h3>
            <p>{{ HOMEPAGE_CONTENT.history }}</p>
          </article>
          <article>
            <p class="story-number" aria-hidden="true">02 / WHAT DRIVES US</p>
            <h3>Our passion</h3>
            <p>{{ HOMEPAGE_CONTENT.passion }}</p>
          </article>
        </div>
      </div>

      <div
        class="picture-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="The people and purpose behind Indigenous"
        tabindex="0"
        @keydown.left.prevent="changePicture(-1)"
        @keydown.right.prevent="changePicture(1)"
      >
        <p class="sr-only">Use the left and right arrow keys to browse the pictures.</p>
        <div class="carousel-picture">
          <div
            v-for="(picture, index) in pictures"
            :key="picture.src"
            :class="['carousel-slide', { 'is-active': currentPicture === index }]"
            role="group"
            aria-roledescription="slide"
            :aria-label="`${index + 1} of ${pictures.length}`"
            :aria-hidden="currentPicture !== index"
          >
            <img :src="picture.src" :alt="picture.alt" :width="picture.width" :height="picture.height" loading="lazy">
            <div class="carousel-shade" />
            <div class="carousel-caption">
              <p class="eyebrow">The human side of precision</p>
              <h3>{{ picture.title }}</h3>
              <p class="picture-description">{{ picture.caption }}</p>
            </div>
          </div>
          <span class="stock-label">Stock photography · Our own story, coming soon</span>
        </div>
        <p class="sr-only" aria-live="off">Picture {{ currentPicture + 1 }} of {{ pictures.length }}: {{ pictures[currentPicture]!.title }}</p>
        <div class="carousel-toolbar">
          <div class="carousel-pagination" aria-label="Choose a picture">
            <button
              v-for="(item, index) in pictures"
              :key="item.src"
              type="button"
              :class="['pagination-dot', { 'is-current': currentPicture === index }]"
              :aria-label="`Show picture ${index + 1}: ${item.title}`"
              :aria-pressed="currentPicture === index"
              @click="selectPicture(index)"
            ><span /></button>
          </div>
          <div class="carousel-controls">
            <span class="picture-count"><strong>0{{ currentPicture + 1 }}</strong> / 0{{ pictures.length }}</span>
            <button class="circle-button" type="button" aria-label="Previous picture" @click="changePicture(-1)">
              <ArrowLeft :size="19" aria-hidden="true" />
            </button>
            <button class="circle-button" type="button" aria-label="Next picture" @click="changePicture(1)">
              <ArrowRight :size="19" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <section id="contact" class="contact-section" aria-labelledby="contact-title">
      <div class="contact-inner page-width">
        <div>
          <p class="eyebrow"><span /> Contact us</p>
          <h2 id="contact-title">Let’s move<br><span>care forward.</span></h2>
          <p class="section-intro">Have a question about our instruments?<br>We’d love to hear from you.</p>
        </div>
        <div class="contact-details">
          <div class="contact-row">
            <span class="contact-icon"><Phone :size="22" :stroke-width="1.5" aria-hidden="true" /></span>
            <div><p class="contact-label">GIVE US A CALL</p><p class="contact-value">{{ HOMEPAGE_CONTENT.phone }}</p></div>
          </div>
          <div class="contact-row">
            <span class="contact-icon"><Mail :size="23" :stroke-width="1.5" aria-hidden="true" /></span>
            <div><p class="contact-label">DROP US A LINE</p><p class="contact-value">{{ HOMEPAGE_CONTENT.email }}</p></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.homepage { --home-blue: #087c9f; --home-dark: #163b4b; --home-muted: #65777f; background: #fff; color: var(--home-dark); font-weight: 400; }
.page-width { width: min(100% - 6rem, 1200px); margin-inline: auto; }
.eyebrow { display: flex; align-items: center; gap: 0.8rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.19em; text-transform: uppercase; }
.eyebrow > span { width: 1.5rem; height: 1px; background: currentColor; }
.hero { position: relative; isolation: isolate; overflow: hidden; background: #163f51; color: white; }
.hero-photo { position: absolute; z-index: -2; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 70% 43%; }
.hero::after { content: ""; position: absolute; z-index: -1; inset: 0; background: linear-gradient(90deg, #092b3f25 40%, #071e3400 75%, #071e3440); }
.hero-inner { position: relative; min-height: 650px; padding-block: 38px 82px; }
.hero-panel { width: 58%; padding: 64px 56px 49px; background: rgb(6 126 155 / 80%); }
.hero-eyebrow { color: #d6f3f6; }
.hero h1 { margin-block: 34px 25px; font-size: clamp(4rem, 6.3vw, 6.4rem); font-weight: 400; letter-spacing: -0.035em; line-height: 1.02; }
.hero-description { color: #e4f2f6; font-size: 1.17rem; line-height: 1.65; }
.catalogue-button { display: inline-flex; align-items: center; gap: 12px; min-height: 54px; margin-top: 31px; padding: 14px 20px; background: #fff; color: #14546a; font-size: 0.98rem; font-weight: 600; border: 1px solid white; cursor: not-allowed; }
.pdf-label { border-left: 1px solid #c7dce2; margin-left: 11px; padding-left: 15px; font-size: 0.7rem; letter-spacing: 0.1em; }
.hero-discover { position: absolute; left: 0; bottom: 26px; display: inline-flex; align-items: center; gap: 23px; font-size: 0.77rem; letter-spacing: 0.07em; }
.hero-discover:hover { color: #b6efff; }
.intro-strip { background: #f0f6f7; border-bottom: 1px solid #e0eaed; }
.intro-strip-inner { display: flex; align-items: center; gap: 44px; padding-block: 30px; }
.intro-strip p { font-size: 1.03rem; line-height: 1.5; }
.intro-strip strong { font-weight: 500; }
.intro-divider { width: 1px; height: 39px; background: #cadbe1; }
.intro-strip .intro-statement { color: var(--home-muted); font-size: 0.93rem; }
.intro-mark { margin-left: auto; color: #88b3c3; font-size: 3.4rem; font-weight: 300; line-height: 1; }
.about-section { padding-block: 100px 80px; scroll-margin-top: 100px; }
.about-introduction { display: grid; grid-template-columns: 1fr 1.1fr; gap: 80px; margin-bottom: 58px; }
.about-heading .eyebrow, .contact-section .eyebrow { color: var(--home-blue); }
h2 { font-size: clamp(2.5rem, 3.5vw, 3.6rem); font-weight: 400; letter-spacing: -0.035em; line-height: 1.12; }
.about-heading h2 { margin-top: 24px; }
.about-heading h2 span, .contact-section h2 span { color: var(--home-blue); }
.section-intro { margin-top: 23px; color: var(--home-muted); font-size: 1.04rem; line-height: 1.7; max-width: 330px; }
.about-stories { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; padding-top: 6px; }
.story-number { border-top: 1px solid #ccdde3; padding-top: 16px; color: var(--home-muted); font-size: 0.65rem; font-weight: 500; letter-spacing: 0.13em; }
.about-stories h3 { margin-top: 26px; font-size: 1.5rem; font-weight: 500; }
.about-stories article > p:last-child { margin-top: 13px; color: var(--home-muted); font-size: 1rem; line-height: 1.8; }
.picture-carousel { outline-offset: 6px; }
.carousel-picture { position: relative; overflow: hidden; aspect-ratio: 2.45; background: #163b4b; color: white; }
.carousel-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 650ms ease-in-out; pointer-events: none; }
.carousel-slide.is-active { opacity: 1; }
.carousel-slide > img { width: 100%; height: 100%; object-fit: cover; object-position: center 42%; }
.carousel-shade { position: absolute; inset: 0; background: linear-gradient(0deg, #0b2b40e8, #0b2b4010 85%); }
.carousel-caption { position: absolute; left: 40px; right: 40px; bottom: 52px; }
.carousel-caption .eyebrow { color: #c9e9f4; font-size: 0.65rem; }
.carousel-caption h3 { margin-top: 14px; font-size: clamp(1.8rem, 3.2vw, 2.7rem); font-weight: 400; letter-spacing: -0.025em; line-height: 1.15; }
.picture-description { margin-top: 10px; color: #e1edf2; font-size: 0.95rem; line-height: 1.5; }
.stock-label { position: absolute; bottom: 14px; left: 40px; font-size: 0.64rem; color: #d0dfe5; letter-spacing: 0.04em; }
.carousel-toolbar { display: flex; align-items: center; justify-content: space-between; padding-block: 18px; border-bottom: 1px solid #dae5e8; }
.carousel-pagination, .carousel-controls { display: flex; align-items: center; gap: 8px; }
.pagination-dot { display: grid; place-items: center; width: 28px; height: 40px; cursor: pointer; }
.pagination-dot span { width: 6px; height: 6px; border-radius: 100%; background: #bdcdd3; transition: width 180ms, background 180ms; }
.pagination-dot.is-current span { width: 23px; border-radius: 4px; background: var(--home-blue); }
.circle-button { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid #cbdce2; border-radius: 50%; cursor: pointer; }
.circle-button:hover { border-color: var(--home-blue); background: var(--home-blue); color: white; }
.picture-count { margin-right: 8px; color: var(--home-muted); font-size: 0.8rem; letter-spacing: 0.04em; }
.picture-count strong { font-weight: 600; color: var(--home-dark); }
.contact-section { background: #eef5f7; scroll-margin-top: 72px; }
.contact-inner { display: grid; grid-template-columns: 1fr 1.1fr; gap: 80px; padding-block: 78px 82px; }
.contact-section h2 { margin-top: 24px; font-size: clamp(3rem, 4.5vw, 4.4rem); }
.contact-details { padding-top: 38px; }
.contact-row { display: flex; align-items: center; gap: 24px; padding-block: 25px; border-bottom: 1px solid #c6dce3; }
.contact-row:first-child { padding-top: 0; }
.contact-icon { display: grid; place-items: center; flex-shrink: 0; width: 50px; height: 50px; color: var(--home-blue); border: 1px solid #bcd5df; border-radius: 50%; }
.contact-label { color: var(--home-muted); font-size: 0.64rem; font-weight: 500; letter-spacing: 0.16em; }
.contact-value { margin-top: 8px; font-size: clamp(1.5rem, 2.4vw, 2.05rem); font-weight: 400; line-height: 1.2; overflow-wrap: anywhere; }
.homepage a:focus-visible, .homepage button:focus-visible, .picture-carousel:focus-visible { outline: 2px solid #087c9f; outline-offset: 5px; }
.hero a:focus-visible { outline-color: white; }
@media (min-width: 1600px) { .hero-photo { object-position: center 43%; } }
@media (max-width: 1100px) {
  .page-width { width: calc(100% - 4rem); }
  .hero-panel { width: 63%; padding-inline: 38px; }
  .hero h1 { font-size: clamp(3.8rem, 7vw, 5rem); }
  .about-introduction, .contact-inner { gap: 45px; grid-template-columns: 0.9fr 1.1fr; }
  .about-stories { gap: 25px; }
}
@media (max-width: 760px) {
  .page-width { width: calc(100% - 2.5rem); }
  .hero-inner { min-height: 650px; padding-block: 28px 74px; }
  .hero-panel { width: min(100%, 490px); padding: 45px 30px 36px; background: #067993ed; }
  .hero-photo { object-position: 65% center; }
  .hero h1 { font-size: clamp(2.75rem, 12vw, 5rem); }
  .hero-description { font-size: 1.08rem; }
  .intro-strip-inner { gap: 25px; padding-block: 25px; }
  .intro-strip p { font-size: 0.93rem; }
  .intro-strip .intro-statement { font-size: 0.85rem; }
  .intro-mark { display: none; }
  .about-section { padding-block: 65px 60px; }
  .about-introduction { grid-template-columns: 1fr; gap: 36px; margin-bottom: 36px; }
  .about-stories { gap: 30px; }
  .section-intro { max-width: 380px; }
  .carousel-picture { aspect-ratio: 1.3; }
  .carousel-caption { left: 25px; right: 25px; bottom: 54px; }
  .carousel-caption h3 { max-width: 300px; }
  .stock-label { left: 25px; right: 25px; font-size: 0.59rem; }
  .contact-inner { grid-template-columns: 1fr; gap: 30px; padding-block: 60px; }
  .contact-details { padding-top: 0; }
}
@media (max-width: 390px) {
  .hero-panel { padding-inline: 22px; }
  .catalogue-button { padding-inline: 10px; gap: 8px; font-size: 0.85rem; white-space: nowrap; }
  .pdf-label { margin-left: 3px; padding-left: 8px; }
  .desktop-break { display: none; }
  .about-stories { grid-template-columns: 1fr; }
  .carousel-picture { aspect-ratio: 0.95; }
  .carousel-caption .eyebrow { font-size: 0.55rem; }
  .carousel-controls { gap: 6px; }
  .circle-button { width: 40px; height: 40px; }
  .pagination-dot { width: 22px; }
  .picture-count { margin-right: 2px; font-size: 0.72rem; }
  .intro-strip-inner { gap: 18px; }
}
@media (prefers-reduced-motion: reduce) {
  .homepage *, .homepage *::before, .homepage *::after { animation: none !important; transition: none !important; }
}
</style>
