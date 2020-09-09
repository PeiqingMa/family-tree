package me.self.familytree.beans

import io.micronaut.http.client.DefaultHttpClientConfiguration
import java.time.Duration
import java.util.*

class HttpClientConfigurationForTest : DefaultHttpClientConfiguration() {
    override fun getReadTimeout(): Optional<Duration> {
        return Optional.of(Duration.ofSeconds(300L))
    }
}
