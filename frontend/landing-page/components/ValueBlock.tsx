import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ValueBlockProps {
  icon: ReactNode
  title: string
  description: string
  delay?: number
}

export default function ValueBlock({ icon, title, description, delay = 0 }: ValueBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
      className="group"
    >
      <div className="p-8 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 h-full">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 mb-6 group-hover:from-purple-200 group-hover:to-indigo-200 transition-colors"
        >
          {icon}
        </motion.div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-purple-600 transition-colors">
          {title}
        </h3>
        <p className="text-slate-600 leading-relaxed text-lg">
          {description}
        </p>
      </div>
    </motion.div>
  )
}












