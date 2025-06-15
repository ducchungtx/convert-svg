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
                <Button variant="ghost" className="text-blue-600 hover:text-blue-800">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gray-300 hover:bg-gray-200!">Get Started</Button>
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
            <Link href="/guest-convert">
              <Button size="lg" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                Try Free Now (No Signup)
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg" className="px-8 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-600! hover:text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300">
                Full Access
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              ✨ Try 5 free conversions daily without registration •
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                Register for unlimited access
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Guest Features Section */}
      <section className="py-16 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Try Before You Sign Up
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience our conversion tool with no commitment. Perfect for quick conversions and testing our quality.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">5</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Free Daily Conversions</h3>
                  <p className="text-gray-600">Convert up to 5 SVG files daily without any registration</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Instant Access</h3>
                  <p className="text-gray-600">Start converting immediately - no forms, no waiting</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Privacy First</h3>
                  <p className="text-gray-600">Files processed securely and deleted automatically</p>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/guest-convert">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                    Start Converting Now
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg border">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Guest vs Registered</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Daily conversions</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Guest: 5</div>
                    <div className="text-sm font-semibold text-blue-600">Registered: 50+</div>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">File size limit</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Guest: 10MB</div>
                    <div className="text-sm font-semibold text-blue-600">Registered: 100MB</div>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Batch conversion</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Guest: 3 files</div>
                    <div className="text-sm font-semibold text-blue-600">Registered: Unlimited</div>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Supported formats</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Guest: Basic</div>
                    <div className="text-sm font-semibold text-blue-600">Registered: All formats</div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/register">
                  <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-600! hover:text-white">
                    Upgrade to Full Access
                  </Button>
                </Link>
              </div>
            </div>
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
