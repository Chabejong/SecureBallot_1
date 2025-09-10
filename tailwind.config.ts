import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Design-specific color mappings for The Ballot Box
        "trust-blue": {
          DEFAULT: "#1E3A8A", // Primary trust blue
          50: "#EFF6FF",
          100: "#DBEAFE", 
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#1E3A8A", // Main brand color
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        "integrity-green": {
          DEFAULT: "#059669", // Secondary integrity green
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#059669", // Main secondary color
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        "alert-red": {
          DEFAULT: "#DC2626", // Accent alert red
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626", // Main accent color
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "Fira Code", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in": {
          from: {
            transform: "translateX(-100%)",
          },
          to: {
            transform: "translateX(0)",
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 5px var(--primary)",
          },
          "50%": {
            boxShadow: "0 0 20px var(--primary), 0 0 30px var(--primary)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      boxShadow: {
        "trust": "var(--shadow-lg)",
        "security": "0 0 0 1px var(--primary), 0 4px 12px hsla(220, 91%, 32%, 0.15)",
        "glow": "0 0 20px var(--primary)",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      maxWidth: {
        "8xl": "88rem",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    // Custom plugin for The Ballot Box specific utilities
    function({ addUtilities }: any) {
      const newUtilities = {
        '.trust-indicator': {
          'box-shadow': '0 0 0 1px var(--primary), 0 4px 12px hsla(220, 91%, 32%, 0.15)',
        },
        '.security-badge': {
          'background': 'linear-gradient(135deg, var(--secondary), var(--primary))',
        },
        '.voting-glow': {
          'animation': 'pulse-glow 2s ease-in-out infinite',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;
