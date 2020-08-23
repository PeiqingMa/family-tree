package me.self.familytree.controller

import io.micronaut.context.ApplicationContext
import io.micronaut.http.HttpRequestFactory
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.RxHttpClient
import io.micronaut.runtime.server.EmbeddedServer
import io.micronaut.test.annotation.MicronautTest
import me.self.familytree.beans.Gender
import me.self.familytree.beans.Person
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

@MicronautTest
class FamilyTreeControllerTest {

    val embeddedServer: EmbeddedServer by lazy { ApplicationContext.run(EmbeddedServer::class.java) }

    val client: HttpClient by lazy { embeddedServer.applicationContext.createBean(RxHttpClient::class.java, embeddedServer.getURL()) }

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
