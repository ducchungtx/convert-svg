'use client'

import Link from "next/link"
import { Upload, Zap, Shield, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">SVG Converter</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Transform Your Images with
            <span className="text-blue-600"> Professional</span> Quality
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Convert SVG files to any format instantly. Fast, secure, and professional-grade
            conversion tool trusted by developers and designers worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                Start Converting Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-8 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300">
                View Features
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Our Converter?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Upload className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-gray-900">Fast & Easy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Drag, drop, and convert. Our intuitive interface makes file conversion
                  effortless for everyone.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle className="text-gray-900">Secure & Private</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Your files are processed securely and automatically deleted after conversion.
                  Privacy guaranteed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle className="text-gray-900">Professional Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  High-quality output with lossless conversion. Perfect for professional
                  projects and production use.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Converting?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join thousands of developers and designers who trust our conversion tool.
          </p>
          <Link href="/register">
            <Button size="lg" className="px-8 py-3 bg-white text-blue-600 hover:bg-gray-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white hover:border-gray-200">
              {"Get Started Now - It's Free"}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Zap className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-bold text-white">SVG Converter</span>
          </div>
          <p>&copy; 2025 SVG Converter. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
