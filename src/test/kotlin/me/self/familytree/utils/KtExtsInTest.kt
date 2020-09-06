package me.self.familytree.utils

import io.micronaut.http.MutableHttpRequest
import io.micronaut.http.client.HttpClient

inline fun <reified T> HttpClient.execute(request: MutableHttpRequest<*>): T {
    return this.toBlocking().retrieve(request, T::class.java)
}
