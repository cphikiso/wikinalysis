import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mainPurple: "rgba(132,25,156,1)",
        darkPurple: "rgba(67,1,82,1)",
        whiteDarkPurple: "rgba(194,162,202,1)",
        whiteMainPurple: "rgba(226,202,232,1)",
        whiteBgFaintPurple: "rgba(250,246,251,1)",
      },
    },
  },
  plugins: [],
};

export default config;
