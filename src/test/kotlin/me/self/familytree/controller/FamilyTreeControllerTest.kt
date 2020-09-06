package me.self.familytree.controller

import io.micronaut.http.HttpRequestFactory
import io.micronaut.http.client.RxHttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.runtime.server.EmbeddedServer
import io.micronaut.test.annotation.MicronautTest
import me.self.familytree.beans.*
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

    private fun addPerson(name: String): PersonView? {
        val person = Person()
        person.addName(name)
        person.bioGender = Gender.Male
        val request = HttpRequestFactory.INSTANCE.post("/v1/person", person)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
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
        val requestBody = RelationRequest(
                firstId,
                secondId,
                FamilyRelations.Type.Parent,
                "bioFather",
                "bio"
        )
        val request = HttpRequestFactory.INSTANCE.post("/v1/relation", requestBody)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
        assertNotNull(response)
        assertTrue(response?.parents?.firstOrNull()?.personId == secondId)
    }

    @Test
    fun testAddSpouseRelation() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val secondId = addPerson("Controller Second ${System.nanoTime()}")?.id!!
        val requestBody = RelationRequest(firstId, secondId, FamilyRelations.Type.Spouse)
        val request = HttpRequestFactory.INSTANCE.post("/v1/relation", requestBody)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
        assertNotNull(response?.spouses?.firstOrNull())
    }

    @Test
    fun testRemoveRelation() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val secondId = addPerson("Controller Second ${System.nanoTime()}")?.id!!
        val requestBody = RelationRequest(
                firstId,
                secondId,
                FamilyRelations.Type.Parent,
                "bioFather",
                "bio"
        )
        val request = HttpRequestFactory.INSTANCE.post("/v1/relation", requestBody)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
        assertNotNull(response)
        assertTrue(response?.parents?.firstOrNull()?.personId == secondId)
        val request2 = HttpRequestFactory.INSTANCE.put("/v1/relation/delete", requestBody)
        val response2 = client.toBlocking().retrieve(request2, PersonView::class.java)
        assertNotNull(response2)
        assertNull(response2?.parents?.firstOrNull())
    }

    @Test
    fun testAddAsRelation() {
        val firstId = addPerson("Controller First ${System.nanoTime()}")?.id!!
        val anotherPerson = Person().also {
            it.addName("Relation Of")
            it.bioGender = Gender.Female
        }
        val requestBody = PersonWithRelationRequest(
                firstId,
                anotherPerson,
                FamilyRelations.Type.Parent,
                "bioMother",
                "bio"
        )
        val request = HttpRequestFactory.INSTANCE.post("/v1/person/relation", requestBody)
        val response = client.toBlocking().retrieve(request, PersonView::class.java)
        assertNotNull(response?.id)
        assertTrue(response?.children?.firstOrNull()?.personId == firstId)
    }

}
