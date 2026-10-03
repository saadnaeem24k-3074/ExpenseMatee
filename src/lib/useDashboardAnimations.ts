import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const FADE_UP = { y: 30, opacity: 0 }

/** Entrance animations for the Dashboard page (desktop and mobile variants). */
export function useDashboardAnimations() {
  useGSAP(() => {
    const mm = gsap.matchMedia()
    const tl = gsap.timeline()

    tl.from(".dash, .but, .balance", {
      ...FADE_UP, duration: 1, stagger: 0.3, ease: "power2.out",
    }, "+=0.3")

    tl.from(".income", { x: 30, opacity: 0, duration: 0.7, ease: "power2.out" })
    tl.from(".expense", { x: -30, opacity: 0, duration: 0.7, ease: "power2.out" }, "-=0.7")
    tl.from(".mychart", FADE_UP)

    mm.add("(min-width: 1024px)", () => {
      gsap.from(".myTable", { ...FADE_UP, duration: 0.7, delay: 1.2 })
    })

    mm.add("(max-width: 1023px)", () => {
      gsap.from(".ourTable", {
        ...FADE_UP,
        scrollTrigger: {
          trigger: ".tracking",
          start: "center 70%",
          end: "center 40%",
          scrub: 2,
        },
      })
    })
  })
}
