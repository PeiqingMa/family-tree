package me.self.familytree.controller

import io.micronaut.http.HttpRequestFactory
import io.micronaut.http.client.RxHttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.runtime.server.EmbeddedServer
import io.micronaut.test.annotation.MicronautTest
import me.self.familytree.beans.FamilyRelations
import me.self.familytree.beans.Gender
import me.self.familytree.beans.Person
import me.self.familytree.beans.RelationRequest
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import javax.inject.Inject

@MicronautTest
class FamilyTreeControllerTest {

    @Inject
    lateinit var embeddedServer: EmbeddedServer

    @Inject
    @field:Client("/")
    lateinit var client: RxHttpClient

    private fun addPerson(name: String): Person? {
        val person = Person()
        person.addName(name)
        person.bioGender = Gender.Male
        val request = HttpRequestFactory.INSTANCE.post("/v1/person", person)
        val response = client.toBlocking().retrieve(request, Person::class.java)
        return response
    }

    @Test
    fun testAddPerson() {
        val name = "Controller Test ${System.nanoTime()}"
        val person = addPerson(name)
        assertNotNull(person?.id)
        assertTrue(person?.names?.contains(name) == true)
    }

    @Test
    fun testAddRelation() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val secondId = addPerson("Controller Second ${System.nanoTime()}")?.id!!
        val requestBody = RelationRequest(firstId, secondId, FamilyRelations.Type.BioFather)
        val request = HttpRequestFactory.INSTANCE.post("/v1/relation", requestBody)
        val response = client.toBlocking().retrieve(request, Person::class.java)
        assertNotNull(response)
        assertTrue(response?.bioFather?.id == secondId)
    }

    @Test
    fun testAddSpouseRelation() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val secondId = addPerson("Controller Second ${System.nanoTime()}")?.id!!
        val requestBody = RelationRequest(firstId, secondId, FamilyRelations.Type.Spouse)
        val request = HttpRequestFactory.INSTANCE.post("/v1/relation", requestBody)
        val response = client.toBlocking().retrieve(request, Person::class.java)
        assertNotNull(response?.spouses?.firstOrNull())
    }

    @Test
    fun testRemoveRelation() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val secondId = addPerson("Controller Second ${System.nanoTime()}")?.id!!
        val requestBody = RelationRequest(firstId, secondId, FamilyRelations.Type.BioFather)
        val request = HttpRequestFactory.INSTANCE.post("/v1/relation", requestBody)
        val response = client.toBlocking().retrieve(request, Person::class.java)
        assertNotNull(response)
        assertTrue(response?.bioFather?.id == secondId)
        val request2 = HttpRequestFactory.INSTANCE.delete("/v1/relation", requestBody)
        val response2 = client.toBlocking().retrieve(request2, Person::class.java)
        assertNotNull(response2)
        assertNull(response2?.bioFather)
        assertNotNull(response2?.parents?.firstOrNull())
    }

}
