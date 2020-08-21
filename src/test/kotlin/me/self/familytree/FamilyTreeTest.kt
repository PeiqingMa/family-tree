package me.self.familytree

import io.micronaut.runtime.EmbeddedApplication
import io.micronaut.test.annotation.MicronautTest
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

@MicronautTest
class FamilyTreeTest(private val application: EmbeddedApplication<*>) {

    @Test
    fun testRunning() {
        assertTrue(application.isRunning)
    }
}
