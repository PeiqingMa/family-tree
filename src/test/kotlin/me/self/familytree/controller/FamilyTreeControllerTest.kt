package me.self.familytree.controller

import io.micronaut.http.HttpRequestFactory
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.runtime.server.EmbeddedServer
import io.micronaut.test.annotation.MicronautTest
import me.self.familytree.beans.Gender
import me.self.familytree.beans.Person
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import javax.inject.Inject

@MicronautTest
class FamilyTreeControllerTest {

    @Inject
    lateinit var embeddedServer: EmbeddedServer

    @Inject
    @field:Client("/")
    lateinit var client: HttpClient

    @Test
    fun testAddPerson() {
        val name = "Controller Test ${System.nanoTime()}"
        val person = Person()
        person.addName(name)
        person.bioGender = Gender.Male
        val request = HttpRequestFactory.INSTANCE.post("/v1/person", person)
        val response = client.toBlocking().retrieve(request, Person::class.java)
        assertNotNull(response)
        assertNotNull(response?.id)
        assertTrue(response?.names?.contains(name) == true)
    }

    fun clean() {
        client.close()
        embeddedServer.close()
    }
}
